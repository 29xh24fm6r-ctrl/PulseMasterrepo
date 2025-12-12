// My Rank API
// app/api/scoreboard/my-rank/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserJobPercentile, getUserTrailingAverageScore } from "@/lib/scoreboard/global";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Get job profile
    const { data: jobProfile } = await supabaseAdmin
      .from("user_job_profiles")
      .select("job_node_id, job_graph_nodes(name, path)")
      .eq("user_id", dbUserId)
      .eq("is_active", true)
      .maybeSingle();

    if (!jobProfile) {
      return NextResponse.json({ error: "No job profile" }, { status: 404 });
    }

    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get today's percentile
    const todayRank = await getUserJobPercentile(userId, today);

    // Get trailing week average and percentile
    const trailingScore = await getUserTrailingAverageScore(userId, 7);
    
    // For trailing week percentile, we'll use the most recent aggregate
    const { data: recentAggregate } = await supabaseAdmin
      .from("job_score_aggregates")
      .select("date, score_histogram, sample_size")
      .eq("job_graph_node_id", jobProfile.job_node_id)
      .lte("date", today.toISOString().split("T")[0])
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    let trailingPercentile: number | null = null;
    if (recentAggregate && trailingScore !== null) {
      // Estimate percentile from histogram
      const histogram = recentAggregate.score_histogram as Record<string, number>;
      const sampleSize = recentAggregate.sample_size || 0;
      
      if (sampleSize > 0) {
        let countBelow = 0;
        const buckets = [
          { key: "0.0-0.2", max: 0.2 },
          { key: "0.2-0.4", max: 0.4 },
          { key: "0.4-0.6", max: 0.6 },
          { key: "0.6-0.8", max: 0.8 },
          { key: "0.8-1.0", max: 1.0 },
        ];

        for (const bucket of buckets) {
          if (trailingScore < bucket.max) {
            const bucketCount = histogram[bucket.key] || 0;
            const bucketStart = bucket.max - 0.2;
            const positionInBucket = (trailingScore - bucketStart) / 0.2;
            countBelow += positionInBucket * bucketCount;
            break;
          } else {
            countBelow += histogram[bucket.key] || 0;
          }
        }

        trailingPercentile = (countBelow / sampleSize) * 100;
      }
    }

    // Get career level
    const { data: progress } = await supabaseAdmin
      .from("user_career_progress")
      .select("current_level_index, career_levels(code, label)")
      .eq("user_id", dbUserId)
      .maybeSingle();

    return NextResponse.json({
      job: {
        nodeId: jobProfile.job_node_id,
        label: (jobProfile.job_graph_nodes as any)?.name || null,
        path: (jobProfile.job_graph_nodes as any)?.path || null,
      },
      today: {
        score: todayRank.score,
        percentile: todayRank.percentile,
      },
      trailingWeek: {
        avgScore: trailingScore,
        percentile: trailingPercentile,
      },
      careerLevel: progress
        ? {
            index: progress.current_level_index || 0,
            code: (progress.career_levels as any)?.code || "rookie",
            label: (progress.career_levels as any)?.label || "Rookie",
          }
        : null,
    });
  } catch (err: any) {
    console.error("[ScoreboardRank] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get rank" },
      { status: 500 }
    );
  }
}




