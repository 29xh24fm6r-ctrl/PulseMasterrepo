import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { 
  ALL_SKILL_TREES, 
  getSkillTreeById, 
  SkillTree,
  UserSkillProgress 
} from "@/lib/philosophy/skill-trees";

// Fallback in-memory store if Supabase not configured
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
 * Get all mastered skills (migrated from Notion to Supabase)
 */
export async function getAllMasteredSkills(): Promise<{ treeId: string; treeName: string; skillId: string; skillName: string }[]> {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const mastered: { treeId: string; treeName: string; skillId: string; skillName: string }[] = [];
  
    for (const tree of ALL_SKILL_TREES) {
      const progress = await getTreeProgress(tree, supabaseUserId);
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
  } catch (error: any) {
    console.error("Failed to get mastered skills:", error);
    return [];
  }
}

async function getTreeProgress(tree: SkillTree, supabaseUserId: string): Promise<Record<string, UserSkillProgress>> {
  // For now, return empty progress - skills tracking would need a Supabase table
  // This can be implemented later when skill progress table is created
  return {};
}
