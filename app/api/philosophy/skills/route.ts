// app/api/philosophy/skills/route.ts (migrated from Notion to Supabase)
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { 
  ALL_SKILL_TREES, 
  getSkillTreeById, 
  SkillTree,
} from "@/lib/philosophy/skill-trees";
import { getAllMasteredSkills, getAllSkillsWithProgress, getTreeProgress, calculateTreeStats } from "@/lib/philosophy/skills";

/**
 * GET - Fetch skill trees and user progress
 */
export async function GET(request: NextRequest) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const { searchParams } = new URL(request.url);
    const treeId = searchParams.get('tree');
    const all = searchParams.get('all');
    const mastered = searchParams.get('mastered');
    
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
      
      const progress = await getTreeProgress(tree, supabaseUserId);
      
      return NextResponse.json({
        ok: true,
        tree,
        progress,
        stats: calculateTreeStats(tree, progress),
      });
    }
    
    if (all === 'true') {
      const treesWithProgress = await getAllSkillsWithProgress();
      return NextResponse.json({ ok: true, trees: treesWithProgress });
    }
    
    // Default: return list of available trees with stats
    const treesList = await Promise.all(
      ALL_SKILL_TREES.map(async (tree) => {
        const progress = await getTreeProgress(tree, supabaseUserId);
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
 * POST - Update skill progress (stub - would need skill_progress table in Supabase)
 */
export async function POST(request: NextRequest) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
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
    
    // TODO: Implement skill progress tracking in Supabase
    // For now, return success but don't persist
    const progress = await getTreeProgress(tree, supabaseUserId);
    
    return NextResponse.json({
      ok: true,
      message: 'Skill progress update not yet implemented in Supabase',
      treeStats: calculateTreeStats(tree, progress),
    });
    
  } catch (error: any) {
    console.error('Skills API error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
