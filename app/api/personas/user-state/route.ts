// Persona User State API
// app/api/personas/user-state/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getPersonaUserState } from "@/lib/personas/memory";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const personaId = searchParams.get("personaId");
    const coachId = searchParams.get("coachId") || undefined;

    if (!personaId) {
      return NextResponse.json({ error: "personaId required" }, { status: 400 });
    }

    const userState = await getPersonaUserState(userId, personaId, coachId);

    return NextResponse.json({ userState });
  } catch (err: any) {
    console.error("[PersonaUserState] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get user state" },
      { status: 500 }
    );
  }
}




