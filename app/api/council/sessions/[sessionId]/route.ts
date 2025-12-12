// Council Session Details API
// app/api/council/sessions/[sessionId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionId = params.sessionId;

    // Get session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("coach_council_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get members
    const { data: members } = await supabaseAdmin
      .from("coach_council_members")
      .select("*")
      .eq("session_id", sessionId);

    // Get deliberations
    const { data: deliberations } = await supabaseAdmin
      .from("coach_council_deliberations")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    // Get summary
    const { data: summary } = await supabaseAdmin
      .from("coach_council_summary")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    return NextResponse.json({
      session,
      members: members || [],
      deliberations: deliberations || [],
      summary: summary || null,
    });
  } catch (err: any) {
    console.error("[CouncilSessionDetails] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch session details" },
      { status: 500 }
    );
  }
}




