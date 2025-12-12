// Reset Persona User State API
// app/api/personas/user-state/reset/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { personaId, coachId } = body;

    if (!personaId) {
      return NextResponse.json({ error: "personaId required" }, { status: 400 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Delete user state
    await supabaseAdmin
      .from("persona_user_state")
      .delete()
      .eq("user_id", dbUserId)
      .eq("persona_id", personaId)
      .eq("coach_id", coachId || null);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[PersonaUserStateReset] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to reset user state" },
      { status: 500 }
    );
  }
}




