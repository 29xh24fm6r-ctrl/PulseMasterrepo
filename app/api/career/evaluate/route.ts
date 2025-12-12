// Career Evaluation API
// app/api/career/evaluate/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { evaluateCareerProgressForUser } from "@/lib/career/progress";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { date } = body;

    const evaluationDate = date ? new Date(date) : new Date();

    // Evaluate progress
    const progress = await evaluateCareerProgressForUser(userId, evaluationDate);

    // Get recent scores
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    const { data: recentScorecards } = await supabaseAdmin
      .from("job_scorecards")
      .select("scorecard_date, overall_score")
      .eq("user_id", dbUserId)
      .gte("scorecard_date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("scorecard_date", { ascending: true });

    return NextResponse.json({
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
    console.error("[CareerEvaluate] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to evaluate career progress" },
      { status: 500 }
    );
  }
}




