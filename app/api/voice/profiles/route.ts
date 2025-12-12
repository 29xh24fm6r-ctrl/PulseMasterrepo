// Voice Profiles API
// app/api/voice/profiles/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getAllActiveVoices } from "@/lib/voice/settings";

export async function GET(req: NextRequest) {
  try {
    const voices = await getAllActiveVoices();

    const profiles = voices.map(v => ({
      id: v.key,
      name: v.display_name,
      description: v.description,
    }));

    return NextResponse.json({ profiles });
  } catch (err: any) {
    console.error("[VoiceProfiles] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch voice profiles" },
      { status: 500 }
    );
  }
}

