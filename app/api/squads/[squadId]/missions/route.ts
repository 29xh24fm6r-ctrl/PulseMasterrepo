// Squad Missions API - POST /api/squads/[squadId]/missions
// app/api/squads/[squadId]/missions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: { squadId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { squadId } = params;
    const body = await request.json();
    const { title, description, startsAt, endsAt } = body;

    if (!title) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }

    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    // Create mission
    const { data: mission, error } = await supabaseAdmin
      .from("squad_missions")
      .insert({
        squad_id: squadId,
        title,
        description,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
        created_by: dbUserId,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ mission });
  } catch (error: any) {
    console.error("Failed to create mission:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



