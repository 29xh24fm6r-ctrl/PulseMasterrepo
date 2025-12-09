/**
 * Voice Command API
 * POST /api/voice/command - Process a voice command
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { processVoiceCommand, generateSpeech } from "@/lib/voice/orchestrator";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { transcript, generateAudio } = body;

    if (!transcript) {
      return NextResponse.json(
        { error: "transcript is required" },
        { status: 400 }
      );
    }

    // Process the command
    const result = await processVoiceCommand(userId, transcript);

    // Optionally generate audio response
    let audioBase64: string | null = null;
    if (generateAudio && result.shouldSpeak) {
      try {
        const audioBuffer = await generateSpeech(userId, result.response);
        audioBase64 = audioBuffer.toString("base64");
      } catch (audioError) {
        console.error("[Voice Command] Audio generation failed:", audioError);
      }
    }

    return NextResponse.json({
      success: true,
      ...result,
      audio: audioBase64,
    });
  } catch (error: any) {
    console.error("[Voice Command] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}