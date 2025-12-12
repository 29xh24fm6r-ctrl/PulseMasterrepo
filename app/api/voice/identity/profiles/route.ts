// Voice Profiles API
// app/api/voice/identity/profiles/route.ts

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

    const { data: profiles } = await supabaseAdmin
      .from("voice_profiles")
      .select("id, contact_name, contact_id, created_at")
      .eq("user_id", dbUserId)
      .order("created_at", { ascending: false });

    return NextResponse.json(profiles || []);
  } catch (err: any) {
    console.error("[VoiceProfiles] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get voice profiles" },
      { status: 500 }
    );
  }
}

