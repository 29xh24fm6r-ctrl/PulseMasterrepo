// Council Sessions API
// app/api/council/sessions/route.ts

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

    const { data: sessions, error } = await supabaseAdmin
      .from("coach_council_sessions")
      .select("*")
      .eq("user_id", dbUserId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching council sessions:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sessions: sessions || [] });
  } catch (err: any) {
    console.error("[CouncilSessions] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch council sessions" },
      { status: 500 }
    );
  }
}




