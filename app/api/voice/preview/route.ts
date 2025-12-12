// Voice Preview API
// app/api/voice/preview/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getActiveVoiceForUser, getAllActiveVoices } from "@/lib/voice/settings";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "EiNlNiXeDU1pqqOPrYMO";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const voiceKey = url.searchParams.get("voice_key");
    const previewText = url.searchParams.get("text") || "Hello! This is Pulse, your AI assistant. How can I help you today?";

    // Get voice profile
    let voiceProfile;
    if (voiceKey) {
      // Preview specific voice
      const allVoices = await getAllActiveVoices();
      voiceProfile = allVoices.find((v) => v.key === voiceKey);
    } else {
      // Use user's active voice
      voiceProfile = await getActiveVoiceForUser(userId);
    }

    if (!voiceProfile) {
      return NextResponse.json({ error: "Voice profile not found" }, { status: 404 });
    }

    // Generate speech using the voice profile
    const voiceId = voiceProfile.provider_voice_id || DEFAULT_VOICE_ID;

    if (voiceProfile.provider === "elevenlabs" && ELEVENLABS_API_KEY) {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            Accept: "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: previewText,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: voiceProfile.style_preset ? parseFloat(voiceProfile.style_preset) : 0.0,
              use_speaker_boost: true,
            },
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

      const audioBuffer = await response.arrayBuffer();
      return new NextResponse(audioBuffer, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": audioBuffer.byteLength.toString(),
        },
      });
    }

    // Fallback to OpenAI TTS if ElevenLabs not available
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const mp3Response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova", // Default OpenAI voice
      input: previewText,
      speed: 1.0,
    });

    const audioBuffer = Buffer.from(await mp3Response.arrayBuffer());
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (err: any) {
    console.error("[VoicePreview] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate preview" },
      { status: 500 }
    );
  }
}

