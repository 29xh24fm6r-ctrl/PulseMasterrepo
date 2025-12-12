// Voice Profiles API
// app/api/voices/profiles/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { seedVoiceProfiles } from "@/lib/voices/seed";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure profiles are seeded
    await seedVoiceProfiles();

    // Get all voice profiles
    const { data: profiles, error } = await supabaseAdmin
      .from("voice_profiles")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching voice profiles:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profiles: profiles || [] });
  } catch (err: any) {
    console.error("[VoiceProfiles] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get voice profiles" },
      { status: 500 }
    );
  }
}




