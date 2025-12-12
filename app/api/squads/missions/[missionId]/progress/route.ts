// Squad Mission Progress API - POST /api/squads/missions/[missionId]/progress
// app/api/squads/missions/[missionId]/progress/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: { missionId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { missionId } = params;
    const body = await request.json();
    const { status, progressPercent } = body;

    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    // Upsert progress
    const { data, error } = await supabaseAdmin
      .from("squad_mission_members")
      .upsert(
        {
          squad_mission_id: missionId,
          user_id: dbUserId,
          status: status || "in_progress",
          progress_percent: progressPercent || 0,
          last_updated_at: new Date().toISOString(),
        },
        {
          onConflict: "squad_mission_id,user_id",
        }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ progress: data });
  } catch (error: any) {
    console.error("Failed to update progress:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



