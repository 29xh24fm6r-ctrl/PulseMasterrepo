// Autopilot Status API
// app/api/life-arc/autopilot/status/route.ts

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

    // Get last daily run
    const { data: lastDailyRun } = await supabaseAdmin
      .from("life_arc_autopilot_runs")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("run_type", "daily")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get today's focus count
    const today = new Date().toISOString().split("T")[0];
    const { count: todayFocusCount } = await supabaseAdmin
      .from("life_arc_daily_focus")
      .select("*", { count: "exact", head: true })
      .eq("user_id", dbUserId)
      .eq("focus_date", today);

    return NextResponse.json({
      status: {
        lastRunDate: lastDailyRun?.created_at || null,
        lastRunStatus: lastDailyRun?.status || null,
        todayFocusCount: todayFocusCount || 0,
      },
    });
  } catch (err: any) {
    console.error("[AutopilotStatus] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get autopilot status" },
      { status: 500 }
    );
  }
}




