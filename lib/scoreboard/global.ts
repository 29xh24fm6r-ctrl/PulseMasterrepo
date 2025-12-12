// Global Scoreboard Engine
// lib/scoreboard/global.ts

import { supabaseAdmin } from "@/lib/supabase";

/**
 * Compute job score aggregates for a date
 */
export async function computeJobScoreAggregates(date: Date): Promise<void> {
  const dateStr = date.toISOString().split("T")[0];

  // Get all job nodes that have scorecards for this date
  const { data: scorecards } = await supabaseAdmin
    .from("job_scorecards")
    .select("job_profile_id, overall_score, user_job_profiles(job_node_id)")
    .eq("scorecard_date", dateStr)
    .not("overall_score", "is", null);

  if (!scorecards || scorecards.length === 0) {
    return;
  }

  // Group by job_node_id
  const scoresByJob: Record<string, number[]> = {};

  for (const sc of scorecards) {
    const jobNodeId = (sc.user_job_profiles as any)?.job_node_id;
    if (!jobNodeId) continue;

    const score = sc.overall_score || 0;
    if (!scoresByJob[jobNodeId]) {
      scoresByJob[jobNodeId] = [];
    }
    scoresByJob[jobNodeId].push(score);
  }

  // Build histogram for each job
  for (const [jobNodeId, scores] of Object.entries(scoresByJob)) {
    const histogram: Record<string, number> = {
      "0.0-0.2": 0,
      "0.2-0.4": 0,
      "0.4-0.6": 0,
      "0.6-0.8": 0,
      "0.8-1.0": 0,
    };

    for (const score of scores) {
      if (score < 0.2) {
        histogram["0.0-0.2"]++;
      } else if (score < 0.4) {
        histogram["0.2-0.4"]++;
      } else if (score < 0.6) {
        histogram["0.4-0.6"]++;
      } else if (score < 0.8) {
        histogram["0.6-0.8"]++;
      } else {
        histogram["0.8-1.0"]++;
      }
    }

    // Upsert aggregate
    await supabaseAdmin
      .from("job_score_aggregates")
      .upsert(
        {
          job_graph_node_id: jobNodeId,
          date: dateStr,
          sample_size: scores.length,
          score_histogram: histogram,
        },
        {
          onConflict: "job_graph_node_id,date",
        }
      );
  }
}

/**
 * Get user's job percentile
 */
export async function getUserJobPercentile(
  userId: string,
  date: Date
): Promise<{ percentile: number | null; score: number | null }> {
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
    return { percentile: null, score: null };
  }

  const dateStr = date.toISOString().split("T")[0];

  // Get user's scorecard for this date
  const { data: userScorecard } = await supabaseAdmin
    .from("job_scorecards")
    .select("overall_score, job_profile_id")
    .eq("user_id", dbUserId)
    .eq("scorecard_date", dateStr)
    .maybeSingle();

  if (!userScorecard || userScorecard.overall_score === null) {
    return { percentile: null, score: null };
  }

  const userScore = userScorecard.overall_score;

  // Get aggregate for this job and date
  const { data: aggregate } = await supabaseAdmin
    .from("job_score_aggregates")
    .select("score_histogram, sample_size")
    .eq("job_graph_node_id", jobProfile.job_node_id)
    .eq("date", dateStr)
    .maybeSingle();

  if (!aggregate || !aggregate.score_histogram) {
    return { percentile: null, score: userScore };
  }

  const histogram = aggregate.score_histogram as Record<string, number>;
  const sampleSize = aggregate.sample_size || 0;

  if (sampleSize === 0) {
    return { percentile: null, score: userScore };
  }

  // Estimate percentile
  let countBelow = 0;
  const buckets = [
    { key: "0.0-0.2", max: 0.2 },
    { key: "0.2-0.4", max: 0.4 },
    { key: "0.4-0.6", max: 0.6 },
    { key: "0.6-0.8", max: 0.8 },
    { key: "0.8-1.0", max: 1.0 },
  ];

  for (const bucket of buckets) {
    if (userScore < bucket.max) {
      // User is in this bucket, estimate position within it
      const bucketCount = histogram[bucket.key] || 0;
      const bucketStart = bucket.max - 0.2;
      const positionInBucket = (userScore - bucketStart) / 0.2;
      countBelow += positionInBucket * bucketCount;
      break;
    } else {
      countBelow += histogram[bucket.key] || 0;
    }
  }

  const percentile = (countBelow / sampleSize) * 100;

  return {
    percentile: Math.min(100, Math.max(0, percentile)),
    score: userScore,
  };
}

/**
 * Get trailing average score for user
 */
export async function getUserTrailingAverageScore(
  userId: string,
  days: number = 7
): Promise<number | null> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: scorecards } = await supabaseAdmin
    .from("job_scorecards")
    .select("overall_score")
    .eq("user_id", dbUserId)
    .gte("scorecard_date", startDate.toISOString().split("T")[0])
    .not("overall_score", "is", null);

  if (!scorecards || scorecards.length === 0) {
    return null;
  }

  const sum = scorecards.reduce((acc, sc) => acc + (sc.overall_score || 0), 0);
  return sum / scorecards.length;
}




