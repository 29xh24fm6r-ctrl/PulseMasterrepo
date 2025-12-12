// Job Scoreboard API
// app/api/jobs/scoreboard/route.ts

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

    const searchParams = req.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "30", 10);

    // Get active job profile
    const { data: profile } = await supabaseAdmin
      .from("user_job_profiles")
      .select("id, job_node_id")
      .eq("user_id", dbUserId)
      .eq("is_active", true)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ scorecards: [], kpis: [] });
    }

    // Get scorecards
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: scorecards } = await supabaseAdmin
      .from("job_scorecards")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("job_profile_id", profile.id)
      .gte("scorecard_date", startDate.toISOString().split("T")[0])
      .order("scorecard_date", { ascending: false });

    // Get KPIs
    const { data: kpis } = await supabaseAdmin
      .from("job_kpis")
      .select("*")
      .eq("job_node_id", profile.job_node_id)
      .order("weight", { ascending: false });

    return NextResponse.json({
      scorecards: scorecards || [],
      kpis: kpis || [],
    });
  } catch (err: any) {
    console.error("[JobScoreboard] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get scoreboard" },
      { status: 500 }
    );
  }
}




