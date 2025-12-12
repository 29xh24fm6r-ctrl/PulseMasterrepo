// Coaching Analytics API
// app/api/coaches/analytics/sessions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

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

    // Get all training sessions
    const { data: sessions } = await supabaseAdmin
      .from("coach_training_sessions")
      .select("*")
      .eq("user_id", dbUserId)
      .order("created_at", { ascending: false })
      .limit(50);

    // Calculate stats
    const scores = sessions?.map((s: any) => parseFloat(s.performance_score || "0")).filter((s) => s > 0) || [];
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highPerformers = scores.filter((s) => s >= 80).length;

    // Skill frequency
    const skillFrequency: Record<string, number> = {};
    sessions?.forEach((s: any) => {
      (s.skill_nodes || []).forEach((skill: string) => {
        skillFrequency[skill] = (skillFrequency[skill] || 0) + 1;
      });
    });

    // Current difficulty (from most recent session)
    const currentDifficulty = sessions?.[0]?.difficulty || "beginner";

    return NextResponse.json({
      sessions: sessions || [],
      stats: {
        totalSessions: sessions?.length || 0,
        averageScore,
        highPerformers,
        currentDifficulty,
        skillFrequency,
      },
    });
  } catch (err: any) {
    console.error("[CoachAnalytics] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load analytics" },
      { status: 500 }
    );
  }
}

