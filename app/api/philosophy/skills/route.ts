import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { 
  ALL_SKILL_TREES, 
  getSkillTreeById, 
  SkillTree,
  UserSkillProgress 
} from "@/lib/philosophy/skill-trees";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const SKILL_PROGRESS_DB = process.env.NOTION_DATABASE_SKILL_PROGRESS || "";

// Fallback in-memory store if Notion not configured
const memoryStore = new Map<string, UserSkillProgress>();

/**
 * GET - Fetch skill trees and user progress
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const treeId = searchParams.get('tree');
    const all = searchParams.get('all');
    const mastered = searchParams.get('mastered'); // Get just mastered skills
    
    // Return just mastered skills (for mentor context)
    if (mastered === 'true') {
      const allMastered = await getAllMasteredSkills();
      return NextResponse.json({ ok: true, masteredSkills: allMastered });
    }
    
    if (treeId) {
      const tree = getSkillTreeById(treeId);
      if (!tree) {
        return NextResponse.json({ ok: false, error: 'Tree not found' }, { status: 404 });
      }
      
      const progress = await getTreeProgress(tree);
      
      return NextResponse.json({
        ok: true,
        tree,
        progress,
        stats: calculateTreeStats(tree, progress),
      });
    }
    
    if (all === 'true') {
      const treesWithProgress = await Promise.all(
        ALL_SKILL_TREES.map(async (tree) => ({
          tree,
          progress: await getTreeProgress(tree),
          stats: calculateTreeStats(tree, await getTreeProgress(tree)),
        }))
      );
      
      return NextResponse.json({ ok: true, trees: treesWithProgress });
    }
    
    // Default: return list of available trees with stats
    const treesList = await Promise.all(
      ALL_SKILL_TREES.map(async (tree) => {
        const progress = await getTreeProgress(tree);
        const stats = calculateTreeStats(tree, progress);
        return {
          id: tree.id,
          name: tree.name,
          philosophy: tree.philosophy,
          description: tree.description,
          icon: tree.icon,
          color: tree.color,
          skillCount: tree.skills.length,
          mentorIds: tree.mentorIds,
          mastered: stats.mastered,
          percentComplete: stats.percentComplete,
        };
      })
    );
    
    return NextResponse.json({ ok: true, trees: treesList });
    
  } catch (error: any) {
    console.error('Skills API error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST - Update skill progress
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, treeId, skillId } = body;
    
    if (!action || !treeId || !skillId) {
      return NextResponse.json(
        { ok: false, error: 'action, treeId, and skillId required' },
        { status: 400 }
      );
    }
    
    const tree = getSkillTreeById(treeId);
    const skill = tree?.skills.find(s => s.id === skillId);
    
    if (!tree || !skill) {
      return NextResponse.json({ ok: false, error: 'Tree or skill not found' }, { status: 404 });
    }
    
    // Check prerequisites
    const masteredSkills = await getMasteredSkills(treeId);
    const prereqsMet = skill.prerequisites.every(p => masteredSkills.includes(p));
    
    if (!prereqsMet && action !== 'reset') {
      return NextResponse.json({ ok: false, error: 'Prerequisites not met' }, { status: 400 });
    }
    
    switch (action) {
      case 'start':
        await saveProgress(treeId, skillId, 'in_progress');
        break;
        
      case 'complete':
        await saveProgress(treeId, skillId, 'mastered');
        break;
        
      case 'reset':
        await deleteProgress(treeId, skillId);
        break;
        
      default:
        return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
    }
    
    const progress = await getTreeProgress(tree);
    
    return NextResponse.json({
      ok: true,
      treeStats: calculateTreeStats(tree, progress),
    });
    
  } catch (error: any) {
    console.error('Skills API error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// ============================================
// NOTION PERSISTENCE FUNCTIONS
// ============================================

async function saveProgress(treeId: string, skillId: string, state: 'in_progress' | 'mastered') {
  const key = `${treeId}:${skillId}`;
  
  if (SKILL_PROGRESS_DB) {
    try {
      // Check if entry exists
      const existing = await findProgressEntry(treeId, skillId);
      
      if (existing) {
        // Update existing
        await notion.pages.update({
          page_id: existing.id,
          properties: {
            'State': { select: { name: state } },
            ...(state === 'mastered' ? { 'Mastered At': { date: { start: new Date().toISOString() } } } : {}),
          },
        });
      } else {
        // Create new
        await notion.pages.create({
          parent: { database_id: SKILL_PROGRESS_DB.replace(/-/g, '') },
          properties: {
            'Skill ID': { title: [{ text: { content: skillId } }] },
            'Tree ID': { select: { name: treeId } },
            'State': { select: { name: state } },
            'Started At': { date: { start: new Date().toISOString() } },
            ...(state === 'mastered' ? { 'Mastered At': { date: { start: new Date().toISOString() } } } : {}),
          },
        });
      }
      console.log(`✅ Skill progress saved to Notion: ${treeId}/${skillId} = ${state}`);
    } catch (error) {
      console.error('Notion save failed, using memory:', error);
      memoryStore.set(key, {
        odId: treeId,
        odllId: skillId,
        state,
        startedAt: new Date().toISOString(),
        ...(state === 'mastered' ? { masteredAt: new Date().toISOString() } : {}),
        attempts: 1,
      });
    }
  } else {
    // Use memory store
    memoryStore.set(key, {
      odId: treeId,
      odllId: skillId,
      state,
      startedAt: new Date().toISOString(),
      ...(state === 'mastered' ? { masteredAt: new Date().toISOString() } : {}),
      attempts: 1,
    });
  }
}

async function deleteProgress(treeId: string, skillId: string) {
  const key = `${treeId}:${skillId}`;
  
  if (SKILL_PROGRESS_DB) {
    try {
      const existing = await findProgressEntry(treeId, skillId);
      if (existing) {
        await notion.pages.update({
          page_id: existing.id,
          archived: true,
        });
      }
    } catch (error) {
      console.error('Notion delete failed:', error);
    }
  }
  
  memoryStore.delete(key);
}

async function findProgressEntry(treeId: string, skillId: string): Promise<{ id: string } | null> {
  if (!SKILL_PROGRESS_DB) return null;
  
  try {
    const response = await notion.databases.query({
      database_id: SKILL_PROGRESS_DB.replace(/-/g, ''),
      filter: {
        and: [
          { property: 'Skill ID', title: { equals: skillId } },
          { property: 'Tree ID', select: { equals: treeId } },
        ],
      },
      page_size: 1,
    });
    
    return response.results.length > 0 ? { id: response.results[0].id } : null;
  } catch {
    return null;
  }
}

async function getTreeProgress(tree: SkillTree): Promise<Record<string, UserSkillProgress>> {
  const progress: Record<string, UserSkillProgress> = {};
  
  if (SKILL_PROGRESS_DB) {
    try {
      const response = await notion.databases.query({
        database_id: SKILL_PROGRESS_DB.replace(/-/g, ''),
        filter: {
          property: 'Tree ID',
          select: { equals: tree.id },
        },
      });
      
      for (const page of response.results as any[]) {
        const props = page.properties;
        const skillId = props['Skill ID']?.title?.[0]?.plain_text;
        const state = props['State']?.select?.name || 'in_progress';
        
        if (skillId) {
          progress[skillId] = {
            odId: tree.id,
            odllId: skillId,
            state: state as any,
            startedAt: props['Started At']?.date?.start,
            masteredAt: props['Mastered At']?.date?.start,
            attempts: 1,
          };
        }
      }
    } catch (error) {
      console.error('Notion fetch failed, using memory:', error);
    }
  }
  
  // Merge with memory store
  for (const [key, value] of memoryStore.entries()) {
    if (key.startsWith(`${tree.id}:`)) {
      const skillId = key.split(':')[1];
      progress[skillId] = value;
    }
  }
  
  return progress;
}

async function getMasteredSkills(treeId: string): Promise<string[]> {
  const tree = getSkillTreeById(treeId);
  if (!tree) return [];
  
  const progress = await getTreeProgress(tree);
  return Object.entries(progress)
    .filter(([_, p]) => p.state === 'mastered')
    .map(([id, _]) => id);
}

async function getAllMasteredSkills(): Promise<{ treeId: string; treeName: string; skillId: string; skillName: string }[]> {
  const mastered: { treeId: string; treeName: string; skillId: string; skillName: string }[] = [];
  
  for (const tree of ALL_SKILL_TREES) {
    const progress = await getTreeProgress(tree);
    for (const [skillId, p] of Object.entries(progress)) {
      if (p.state === 'mastered') {
        const skill = tree.skills.find(s => s.id === skillId);
        if (skill) {
          mastered.push({
            treeId: tree.id,
            treeName: tree.name,
            skillId: skill.id,
            skillName: skill.name,
          });
        }
      }
    }
  }
  
  return mastered;
}

function calculateTreeStats(tree: SkillTree, progress: Record<string, UserSkillProgress>) {
  const total = tree.skills.length;
  const mastered = Object.values(progress).filter(p => p.state === 'mastered').length;
  const inProgress = Object.values(progress).filter(p => p.state === 'in_progress').length;
  const masteredSkillIds = Object.entries(progress)
    .filter(([_, p]) => p.state === 'mastered')
    .map(([id, _]) => id);
  
  const available = tree.skills.filter(skill => {
    if (progress[skill.id]) return false;
    return skill.prerequisites.every(p => masteredSkillIds.includes(p));
  }).length;
  
  const locked = total - mastered - inProgress - available;
  
  return {
    total,
    mastered,
    inProgress,
    available,
    locked,
    percentComplete: Math.round((mastered / total) * 100),
  };
}
