// Voice Upload API
// app/api/coaches/voice/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { transcribeAudio } from "@/lib/audio/transcription";
import { analyzeVoiceConversation } from "@/lib/coaches/voiceAnalysis";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Transcribe
    const transcription = await transcribeAudio(buffer, {
      language: "en",
    });

    if (!transcription.text || transcription.provider === "fallback") {
      return NextResponse.json(
        { error: "Transcription failed. Please configure Deepgram or ElevenLabs API key." },
        { status: 500 }
      );
    }

    // Analyze conversation
    const analysis = await analyzeVoiceConversation(
      transcription.text,
      transcription.segments
    );

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Save session
    const { data: session } = await supabaseAdmin
      .from("coach_voice_sessions")
      .insert({
        user_id: dbUserId,
        transcript: transcription.text,
        coaching_summary: {
          patterns: analysis.patterns,
          negotiation: analysis.negotiation,
          emotionalTriggers: analysis.emotionalTriggers,
          coachingActions: analysis.coachingActions,
        },
        sentiment_curve: analysis.sentiment.curve,
        patterns_detected: analysis.patterns,
      })
      .select("id")
      .single();

    return NextResponse.json({
      sessionId: session?.id,
      transcript: transcription.text,
      analysis,
      confidence: transcription.confidence,
    });
  } catch (err: any) {
    console.error("[VoiceUpload] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process audio" },
      { status: 500 }
    );
  }
}

