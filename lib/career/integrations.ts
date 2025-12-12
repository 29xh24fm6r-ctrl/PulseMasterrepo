// Career Engine Integrations
// lib/career/integrations.ts

import { supabaseAdmin } from "@/lib/supabase";
import { buildUniversalUserModel } from "@/lib/memory/universal";

/**
 * Get career context for Autopilot
 * Returns missions and level info that Autopilot can use to prioritize actions
 */
export async function getCareerContextForAutopilot(
  userId: string
): Promise<{
  currentLevel: string;
  activeMissions: Array<{
    id: string;
    title: string;
    definition: any;
  }>;
}> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get career progress
  const { data: progress } = await supabaseAdmin
    .from("user_career_progress")
    .select("current_level_index, career_levels(code)")
    .eq("user_id", dbUserId)
    .maybeSingle();

  // Get active missions
  const today = new Date().toISOString().split("T")[0];
  const { data: missions } = await supabaseAdmin
    .from("user_career_missions")
    .select("id, career_missions(title, definition)")
    .eq("user_id", dbUserId)
    .eq("assigned_date", today)
    .in("status", ["assigned", "in_progress"]);

  return {
    currentLevel: (progress?.career_levels as any)?.code || "rookie",
    activeMissions: (missions || []).map((m) => ({
      id: m.id,
      title: (m.career_missions as any)?.title || "Mission",
      definition: (m.career_missions as any)?.definition || {},
    })),
  };
}

/**
 * Get career context for Simulation
 * Returns level info and next level requirements for scenario generation
 */
export async function getCareerContextForSimulation(
  userId: string
): Promise<{
  currentLevel: {
    code: string;
    label: string;
    min_overall_score: number | null;
  };
  nextLevel: {
    code: string;
    label: string;
    min_overall_score: number | null;
    min_days_at_or_above: number;
  } | null;
}> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get career progress with levels
  const { data: progress } = await supabaseAdmin
    .from("user_career_progress")
    .select(
      "current_level_index, career_levels(code, label, min_overall_score), career_tracks(id)"
    )
    .eq("user_id", dbUserId)
    .maybeSingle();

  if (!progress) {
    return {
      currentLevel: { code: "rookie", label: "Rookie", min_overall_score: 0.2 },
      nextLevel: { code: "operator", label: "Operator", min_overall_score: 0.4, min_days_at_or_above: 7 },
    };
  }

  const currentLevel = progress.career_levels as any;
  const currentIndex = progress.current_level_index || 0;

  // Get next level
  const { data: nextLevel } = await supabaseAdmin
    .from("career_levels")
    .select("*")
    .eq("career_track_id", (progress.career_tracks as any)?.id)
    .eq("level_index", currentIndex + 1)
    .maybeSingle();

  return {
    currentLevel: {
      code: currentLevel?.code || "rookie",
      label: currentLevel?.label || "Rookie",
      min_overall_score: currentLevel?.min_overall_score || 0.2,
    },
    nextLevel: nextLevel
      ? {
          code: nextLevel.code,
          label: nextLevel.label,
          min_overall_score: nextLevel.min_overall_score,
          min_days_at_or_above: nextLevel.min_days_at_or_above,
        }
      : null,
  };
}

/**
 * Get career context for Universal Memory / Coaching
 * Returns level, missions, and progress for LLM context
 */
export async function getCareerContextForMemory(
  userId: string
): Promise<{
  level: string;
  progressToNext: number;
  activeMissions: string[];
  recentPromotion: boolean;
}> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get career progress
  const { data: progress } = await supabaseAdmin
    .from("user_career_progress")
    .select("current_level_index, progress_score, career_levels(code), last_evaluated_at")
    .eq("user_id", dbUserId)
    .maybeSingle();

  // Get active missions
  const today = new Date().toISOString().split("T")[0];
  const { data: missions } = await supabaseAdmin
    .from("user_career_missions")
    .select("career_missions(title)")
    .eq("user_id", dbUserId)
    .eq("assigned_date", today)
    .in("status", ["assigned", "in_progress"]);

  // Check if recently promoted (within last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentPromotion =
    progress?.last_evaluated_at &&
    new Date(progress.last_evaluated_at) > sevenDaysAgo &&
    (progress.current_level_index || 0) > 0;

  return {
    level: (progress?.career_levels as any)?.code || "rookie",
    progressToNext: progress?.progress_score || 0,
    activeMissions: (missions || []).map(
      (m) => (m.career_missions as any)?.title || "Mission"
    ),
    recentPromotion: recentPromotion || false,
  };
}




