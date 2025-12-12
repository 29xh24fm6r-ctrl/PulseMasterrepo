// Career Status API
// app/api/career/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { evaluateCareerProgressForUser, getOrCreateUserCareerProgress } from "@/lib/career/progress";

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

    // Get or create progress
    const { trackId } = await getOrCreateUserCareerProgress(userId);

    // Evaluate progress
    const progress = await evaluateCareerProgressForUser(userId);

    // Get job profile info
    const { data: jobProfile } = await supabaseAdmin
      .from("user_job_profiles")
      .select("job_node_id, job_graph_nodes(name, path)")
      .eq("user_id", dbUserId)
      .eq("is_active", true)
      .maybeSingle();

    // Get track info
    const { data: track } = await supabaseAdmin
      .from("career_tracks")
      .select("id, name, description")
      .eq("id", trackId)
      .single();

    // Get recent scores (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentScorecards } = await supabaseAdmin
      .from("job_scorecards")
      .select("scorecard_date, overall_score")
      .eq("user_id", dbUserId)
      .gte("scorecard_date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("scorecard_date", { ascending: true });

    return NextResponse.json({
      job: {
        nodeId: jobProfile?.job_node_id || null,
        label: (jobProfile?.job_graph_nodes as any)?.name || null,
        path: (jobProfile?.job_graph_nodes as any)?.path || null,
      },
      track: {
        id: track?.id || null,
        name: track?.name || null,
        description: track?.description || null,
      },
      currentLevel: progress.currentLevel,
      nextLevel: progress.nextLevel,
      progressScore: progress.progressScore,
      promoted: progress.promoted,
      recentScores: (recentScorecards || []).map((sc) => ({
        date: sc.scorecard_date,
        overall_score: sc.overall_score || 0,
      })),
    });
  } catch (err: any) {
    console.error("[CareerStatus] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get career status" },
      { status: 500 }
    );
  }
}




