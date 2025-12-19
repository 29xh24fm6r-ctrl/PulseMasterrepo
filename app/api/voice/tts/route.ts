import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getActiveVoiceForUser, getUserVoiceSettings } from "@/lib/voice/settings";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

if (!ELEVENLABS_API_KEY) {
  throw new Error("Missing ELEVENLABS_API_KEY environment variable");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voiceId: overrideVoiceId, style } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Get user's voice settings if authenticated
    let activeVoiceId = overrideVoiceId || DEFAULT_VOICE_ID || "EiNlNiXeDU1pqqOPrYMO";
    let speakingRate = 1.0;

    try {
      const { userId } = await auth();
      if (userId && !overrideVoiceId) {
        const voiceProfile = await getActiveVoiceForUser(userId);
        if (voiceProfile) {
          activeVoiceId = voiceProfile.provider_voice_id || DEFAULT_VOICE_ID;
        }

        const userSettings = await getUserVoiceSettings(userId);
        if (userSettings?.speaking_rate) {
          speakingRate = userSettings.speaking_rate;
        }
      }
    } catch (err) {
      // If auth fails, use default voice
      console.log("[TTS] Using default voice (auth unavailable)");
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${activeVoiceId}`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: style?.energy || 0.0, // Use energy for style parameter
            use_speaker_boost: true,
          },
          // Note: ElevenLabs doesn't directly support speaking_rate in this endpoint
          // You may need to adjust text or use a different approach for rate control
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("ElevenLabs error:", error);
      return NextResponse.json(
        { error: "Failed to generate speech" },
        { status: response.status }
      );
    }

    // Return audio as binary
    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}