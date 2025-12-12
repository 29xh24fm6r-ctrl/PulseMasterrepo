// Career Progress & Level Evaluation Engine
// lib/career/progress.ts

import { supabaseAdmin } from "@/lib/supabase";
import { ensureDefaultCareerTrackForJob } from "./tracks";

export interface CareerProgressResult {
  currentLevel: {
    id: string;
    index: number;
    code: string;
    label: string;
    description: string | null;
  };
  nextLevel: {
    id: string;
    index: number;
    code: string;
    label: string;
    min_overall_score: number | null;
    min_days_at_or_above: number;
  } | null;
  progressScore: number;
  promoted: boolean;
}

/**
 * Get or create user career progress
 */
export async function getOrCreateUserCareerProgress(
  userId: string
): Promise<{
  progressId: string;
  trackId: string;
  currentLevelIndex: number;
}> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get user's job profile
  const { data: jobProfile } = await supabaseAdmin
    .from("user_job_profiles")
    .select("job_node_id")
    .eq("user_id", dbUserId)
    .eq("is_active", true)
    .maybeSingle();

  if (!jobProfile || !jobProfile.job_node_id) {
    throw new Error("User has no active job profile");
  }

  // Ensure track exists
  const trackId = await ensureDefaultCareerTrackForJob(jobProfile.job_node_id);

  // Get or create progress
  const { data: existing } = await supabaseAdmin
    .from("user_career_progress")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("career_track_id", trackId)
    .maybeSingle();

  if (existing) {
    return {
      progressId: existing.id,
      trackId: existing.career_track_id,
      currentLevelIndex: existing.current_level_index || 0,
    };
  }

  // Get rookie level (index 0)
  const { data: rookieLevel } = await supabaseAdmin
    .from("career_levels")
    .select("id")
    .eq("career_track_id", trackId)
    .eq("level_index", 0)
    .single();

  // Create progress
  const { data: progress } = await supabaseAdmin
    .from("user_career_progress")
    .insert({
      user_id: dbUserId,
      career_track_id: trackId,
      current_level_id: rookieLevel?.id || null,
      current_level_index: 0,
      progress_score: 0.0,
    })
    .select("id")
    .single();

  return {
    progressId: progress?.id || "",
    trackId,
    currentLevelIndex: 0,
  };
}

/**
 * Evaluate career progress for user
 */
export async function evaluateCareerProgressForUser(
  userId: string,
  asOfDate: Date = new Date()
): Promise<CareerProgressResult> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get or create progress
  const { progressId, trackId, currentLevelIndex } =
    await getOrCreateUserCareerProgress(userId);

  // Get all levels ordered by index
  const { data: levels } = await supabaseAdmin
    .from("career_levels")
    .select("*")
    .eq("career_track_id", trackId)
    .order("level_index", { ascending: true });

  if (!levels || levels.length === 0) {
    throw new Error("No career levels found");
  }

  // Load job scorecards for lookback window (60-90 days)
  const lookbackStart = new Date(asOfDate);
  lookbackStart.setDate(lookbackStart.getDate() - 90);

  const { data: scorecards } = await supabaseAdmin
    .from("job_scorecards")
    .select("scorecard_date, overall_score")
    .eq("user_id", dbUserId)
    .gte("scorecard_date", lookbackStart.toISOString().split("T")[0])
    .lte("scorecard_date", asOfDate.toISOString().split("T")[0])
    .order("scorecard_date", { ascending: true });

  // Get total XP (if xp_transactions table exists)
  let totalXP = 0;
  try {
    const { data: xpTransactions } = await supabaseAdmin
      .from("xp_transactions")
      .select("amount")
      .eq("user_id", dbUserId);

    totalXP = (xpTransactions || []).reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );
  } catch (err) {
    // Table might not exist, ignore
  }

  // Determine highest level user qualifies for
  let highestQualifiedIndex = 0;
  let promoted = false;

  for (const level of levels) {
    const minScore = level.min_overall_score || 0;
    const minDays = level.min_days_at_or_above || 0;
    const minXP = level.min_total_xp || 0;

    // Count days meeting score threshold
    const qualifyingDays =
      scorecards?.filter((sc) => (sc.overall_score || 0) >= minScore).length ||
      0;

    // Check if user qualifies
    if (
      qualifyingDays >= minDays &&
      totalXP >= minXP &&
      level.level_index > highestQualifiedIndex
    ) {
      highestQualifiedIndex = level.level_index;
    }
  }

  // Check if promoted
  if (highestQualifiedIndex > currentLevelIndex) {
    promoted = true;
  }

  const currentLevel = levels[highestQualifiedIndex];
  const nextLevel =
    highestQualifiedIndex < levels.length - 1
      ? levels[highestQualifiedIndex + 1]
      : null;

  // Compute progress toward next level
  let progressScore = 0.0;
  if (nextLevel) {
    const minScore = nextLevel.min_overall_score || 0;
    const minDays = nextLevel.min_days_at_or_above || 0;
    const qualifyingDays =
      scorecards?.filter((sc) => (sc.overall_score || 0) >= minScore).length ||
      0;

    progressScore = Math.min(1.0, qualifyingDays / minDays);
  } else {
    progressScore = 1.0; // Max level reached
  }

  // Update progress
  await supabaseAdmin
    .from("user_career_progress")
    .update({
      current_level_id: currentLevel.id,
      current_level_index: currentLevel.level_index,
      progress_score: progressScore,
      last_evaluated_at: asOfDate.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", progressId);

  return {
    currentLevel: {
      id: currentLevel.id,
      index: currentLevel.level_index,
      code: currentLevel.code,
      label: currentLevel.label,
      description: currentLevel.description,
    },
    nextLevel: nextLevel
      ? {
          id: nextLevel.id,
          index: nextLevel.level_index,
          code: nextLevel.code,
          label: nextLevel.label,
          min_overall_score: nextLevel.min_overall_score,
          min_days_at_or_above: nextLevel.min_days_at_or_above,
        }
      : null,
    progressScore,
    promoted,
  };
}




