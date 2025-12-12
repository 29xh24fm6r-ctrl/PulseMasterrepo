// Unknown Speakers API
// app/api/voice/identity/unknown/route.ts

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

    const { data: unknownSpeakers } = await supabaseAdmin
      .from("voice_unknown_speakers")
      .select("id, label, first_seen, last_seen, occurrence_count")
      .eq("user_id", dbUserId)
      .order("last_seen", { ascending: false });

    return NextResponse.json(unknownSpeakers || []);
  } catch (err: any) {
    console.error("[UnknownSpeakers] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get unknown speakers" },
      { status: 500 }
    );
  }
}

