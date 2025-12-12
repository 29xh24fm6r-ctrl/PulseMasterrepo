// Weekly Objectives API
// app/api/life-arc/autopilot/weekly-objectives/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const weekStart = searchParams.get("weekStart");

    // Get week start date (Monday)
    let weekStartDate: string;
    if (weekStart) {
      weekStartDate = weekStart;
    } else {
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diff));
      weekStartDate = monday.toISOString().split("T")[0];
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Get weekly objectives
    const { data: objectives } = await supabaseAdmin
      .from("life_arc_objectives")
      .select("*, life_arcs(*)")
      .eq("user_id", dbUserId)
      .eq("week_start_date", weekStartDate)
      .order("created_at", { ascending: true });

    if (!objectives) {
      return NextResponse.json({ objectives: [] });
    }

    const enriched = objectives.map((obj) => ({
      id: obj.id,
      arcId: obj.arc_id,
      summary: obj.summary,
      targetQuests: obj.target_quests,
      arc: obj.life_arcs
        ? {
            id: obj.life_arcs.id,
            name: obj.life_arcs.name,
            key: obj.life_arcs.key,
          }
        : undefined,
    }));

    return NextResponse.json({ objectives: enriched });
  } catch (err: any) {
    console.error("[WeeklyObjectives] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get weekly objectives" },
      { status: 500 }
    );
  }
}




