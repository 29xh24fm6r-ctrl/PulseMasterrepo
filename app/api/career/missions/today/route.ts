// Today's Career Missions API
// app/api/career/missions/today/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { assignDailyCareerMissions } from "@/lib/career/missions";

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

    // Assign today's missions
    await assignDailyCareerMissions(userId, new Date());

    // Get today's missions
    const today = new Date().toISOString().split("T")[0];

    const { data: missionInstances } = await supabaseAdmin
      .from("user_career_missions")
      .select("*, career_missions(*)")
      .eq("user_id", dbUserId)
      .eq("assigned_date", today)
      .order("created_at", { ascending: true });

    const missions = (missionInstances || []).map((instance) => {
      const mission = (instance.career_missions as any) || {};
      return {
        id: instance.id,
        title: mission.title || "Mission",
        description: mission.description || null,
        difficulty: mission.difficulty || "medium",
        status: instance.status,
        assigned_date: instance.assigned_date,
        due_date: instance.due_date,
        progress: instance.progress || {},
        reward_xp: instance.reward_xp || 0,
        definition: mission.definition || {},
      };
    });

    return NextResponse.json({ missions });
  } catch (err: any) {
    console.error("[CareerMissions] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get today's missions" },
      { status: 500 }
    );
  }
}




