// Coach XP Insights API
// app/api/xp/coach-insights/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getXPTotals } from "@/lib/xp/award";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") || "week") as "today" | "week" | "month" | "all";

    // Get XP totals
    const xpData = await getXPTotals(period);

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Get coaching sessions for this period
    const periodStart = new Date();
    if (period === "week") periodStart.setDate(periodStart.getDate() - 7);
    else if (period === "month") periodStart.setMonth(periodStart.getMonth() - 1);

    const { data: sessions } = await supabaseAdmin
      .from("coach_training_sessions")
      .select("performance_score, difficulty, skill_nodes, xp_awarded")
      .eq("user_id", dbUserId)
      .gte("created_at", periodStart.toISOString())
      .order("created_at", { ascending: false });

    // Calculate insights
    const coachXP = xpData.recentGains.filter((g) => g.activity?.includes("coach"));
    const totalCoachXP = coachXP.reduce((sum, g) => sum + g.amount, 0);

    // Areas of strength (high performance scores)
    const highScores = sessions?.filter((s: any) => (s.performance_score || 0) >= 80) || [];
    const skillFrequency: Record<string, number> = {};
    sessions?.forEach((s: any) => {
      (s.skill_nodes || []).forEach((skill: string) => {
        skillFrequency[skill] = (skillFrequency[skill] || 0) + 1;
      });
    });

    const topSkills = Object.entries(skillFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([skill]) => skill);

    // Recommended skills (areas with lower performance)
    const lowScores = sessions?.filter((s: any) => (s.performance_score || 0) < 60) || [];
    const weakSkills: Record<string, number> = {};
    lowScores.forEach((s: any) => {
      (s.skill_nodes || []).forEach((skill: string) => {
        weakSkills[skill] = (weakSkills[skill] || 0) + 1;
      });
    });

    const recommendedSkills = Object.entries(weakSkills)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([skill]) => skill);

    return NextResponse.json({
      xpEarned: {
        total: totalCoachXP,
        breakdown: xpData.totals,
        recent: coachXP.slice(0, 5),
      },
      areasOfStrength: topSkills,
      recommendedSkills: recommendedSkills.length > 0 ? recommendedSkills : ["objection_handling", "value_framing", "closing"],
      sessionStats: {
        total: sessions?.length || 0,
        averageScore: sessions?.length
          ? sessions.reduce((sum: number, s: any) => sum + (s.performance_score || 0), 0) / sessions.length
          : 0,
        highPerformers: highScores.length,
      },
    });
  } catch (err: any) {
    console.error("[CoachXPInsights] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch insights" },
      { status: 500 }
    );
  }
}

