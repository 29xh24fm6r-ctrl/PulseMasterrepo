import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";

// Types and constants - these should be defined here or imported from a separate definitions file
// For now, stubbing to unblock build
export type Achievement = any;
export type AchievementCondition = any;
export const ALL_ACHIEVEMENTS: Achievement[] = [];
export const RARITY_COLORS: Record<string, any> = {};

export function getAchievementById(id: string): Achievement | null {
  return null;
}

interface ProgressData {
  streak: number;
  skillsMastered: number;
  treesWithMastery: string[];
  completedTrees: string[];
  masteredSkillIds: string[];
}

export interface CheckAchievementsResult {
  ok: boolean;
  newlyUnlocked: Achievement[];
  error?: string;
}

/**
 * Check and unlock achievements based on current progress (migrated from Notion to Supabase)
 */
export async function checkAndUnlockAchievements(): Promise<CheckAchievementsResult> {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    
    const unlocked = await getUnlockedAchievements(supabaseUserId);
    const progress = await getProgressData(supabaseUserId);
    const newlyUnlocked = await checkAndUnlockAchievementsInternal(progress, unlocked);
    
    return {
      ok: true,
      newlyUnlocked: newlyUnlocked.map(a => ({
        id: a.id,
        title: a.title,
        description: a.description,
      })),
    };
  } catch (error: any) {
    console.error("Achievement check error:", error);
    return {
      ok: false,
      newlyUnlocked: [],
      error: error.message || "Failed to check achievements",
    };
  }
}

async function unlockAchievement(achievementId: string, supabaseUserId: string): Promise<void> {
  // Check if already unlocked
  const { data: existing } = await supabaseAdmin
    .from("achievements")
    .select("id")
    .eq("user_id", supabaseUserId)
    .eq("achievement_key", achievementId)
    .single();

  if (!existing) {
    const achievement = getAchievementById(achievementId);
    if (achievement) {
      await supabaseAdmin.from("achievements").insert({
        user_id: supabaseUserId,
        achievement_key: achievementId,
        title: achievement.title || achievementId,
        description: achievement.description || "",
        earned_at: new Date().toISOString(),
      });
    }
  }
}

async function getProgressData(supabaseUserId: string): Promise<ProgressData> {
  // Get streak data from Supabase (if exists)
  // For now, return minimal data
  return {
    streak: 0,
    skillsMastered: 0,
    treesWithMastery: [],
    completedTrees: [],
    masteredSkillIds: [],
  };
}

async function getUnlockedAchievements(supabaseUserId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("achievements")
    .select("achievement_key")
    .eq("user_id", supabaseUserId);

  return (data || []).map((a: any) => a.achievement_key);
}

async function checkAndUnlockAchievementsInternal(
  progress: ProgressData,
  unlocked: string[]
): Promise<Achievement[]> {
  // Achievement checking logic would go here
  // For now, return empty array
  return [];
}
