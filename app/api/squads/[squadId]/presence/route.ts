// Squad Presence API - POST /api/squads/[squadId]/presence
// app/api/squads/[squadId]/presence/route.ts

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
    const { status } = body;

    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    // Upsert presence
    const { data, error } = await supabaseAdmin
      .from("squad_presence")
      .upsert(
        {
          squad_id: squadId,
          user_id: dbUserId,
          status: status || "online",
          last_seen_at: new Date().toISOString(),
        },
        {
          onConflict: "squad_id,user_id",
        }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ presence: data });
  } catch (error: any) {
    console.error("Failed to update presence:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



