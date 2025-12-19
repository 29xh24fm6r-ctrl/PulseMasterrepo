import "server-only";
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

export interface SkillsQueryOptions {
  treeId?: string;
  all?: boolean;
  mastered?: boolean;
}

export interface SkillsResponse {
  ok: boolean;
  trees?: any[];
  tree?: SkillTree;
  progress?: Record<string, UserSkillProgress>;
  stats?: any;
  masteredSkills?: { treeId: string; treeName: string; skillId: string; skillName: string }[];
  error?: string;
}

/**
 * Get all mastered skills
 * Extracted from app/api/philosophy/skills/route.ts
 */
export async function getAllMasteredSkills(): Promise<{ treeId: string; treeName: string; skillId: string; skillName: string }[]> {
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

/**
 * Get all skills with progress
 * Extracted from app/api/philosophy/skills/route.ts
 */
export async function getAllSkillsWithProgress(): Promise<{ tree: SkillTree; progress: Record<string, UserSkillProgress>; stats: any }[]> {
  const treesWithProgress = await Promise.all(
    ALL_SKILL_TREES.map(async (tree) => ({
      tree,
      progress: await getTreeProgress(tree),
      stats: calculateTreeStats(tree, await getTreeProgress(tree)),
    }))
  );
  
  return treesWithProgress;
}

export async function getTreeProgress(tree: SkillTree): Promise<Record<string, UserSkillProgress>> {
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

export function calculateTreeStats(tree: SkillTree, progress: Record<string, UserSkillProgress>) {
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

