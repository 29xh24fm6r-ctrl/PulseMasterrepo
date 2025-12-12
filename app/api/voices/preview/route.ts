// Voice Preview API (TTS sample)
// app/api/voices/preview/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVoiceProfileByKey } from "@/lib/voices/seed";
import { transformTextForVoice } from "@/lib/voices/transform";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { voiceKey, sampleText } = body;

    if (!voiceKey) {
      return NextResponse.json({ error: "voiceKey required" }, { status: 400 });
    }

    const profile = await getVoiceProfileByKey(voiceKey);
    if (!profile) {
      return NextResponse.json({ error: "Voice profile not found" }, { status: 404 });
    }

    // Transform text for voice
    const transformedText = transformTextForVoice({
      originalText: sampleText || "This is a sample of how I sound. I adapt my style to match your needs and emotional state.",
      voiceStyle: profile.style,
    });

    // Return transformed text and voice parameters
    // In production, you'd call TTS API here
    return NextResponse.json({
      text: transformedText,
      voiceKey: profile.key,
      voiceName: profile.name,
      parameters: {
        speed: profile.default_speed,
        energy: profile.default_energy,
        intensity: profile.default_intensity,
      },
    });
  } catch (err: any) {
    console.error("[VoicePreview] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to preview voice" },
      { status: 500 }
    );
  }
}




