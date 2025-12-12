// Daily Focus API
// app/api/life-arc/autopilot/daily-focus/route.ts

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
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Get daily focus items
    const { data: focusItems } = await supabaseAdmin
      .from("life_arc_daily_focus")
      .select("*, life_arc_quests(*), life_arcs(*)")
      .eq("user_id", dbUserId)
      .eq("focus_date", date)
      .order("created_at", { ascending: true });

    if (!focusItems) {
      return NextResponse.json({ focus: [] });
    }

    const enriched = focusItems.map((item) => ({
      id: item.id,
      arcId: item.arc_id,
      questId: item.quest_id,
      status: item.status,
      quest: item.life_arc_quests
        ? {
            id: item.life_arc_quests.id,
            title: item.life_arc_quests.title,
            description: item.life_arc_quests.description,
            difficulty: item.life_arc_quests.difficulty,
            impact: item.life_arc_quests.impact,
          }
        : undefined,
      arc: item.life_arcs
        ? {
            id: item.life_arcs.id,
            name: item.life_arcs.name,
            key: item.life_arcs.key,
          }
        : undefined,
    }));

    return NextResponse.json({ focus: enriched });
  } catch (err: any) {
    console.error("[DailyFocus] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get daily focus" },
      { status: 500 }
    );
  }
}




