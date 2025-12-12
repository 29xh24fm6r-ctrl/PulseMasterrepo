// Voice Analysis API (for existing transcripts)
// app/api/coaches/voice/analyze/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { analyzeVoiceConversation } from "@/lib/coaches/voiceAnalysis";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { transcript, segments } = body;

    if (!transcript) {
      return NextResponse.json({ error: "Transcript required" }, { status: 400 });
    }

    const analysis = await analyzeVoiceConversation(transcript, segments);

    return NextResponse.json({
      analysis,
    });
  } catch (err: any) {
    console.error("[VoiceAnalyze] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to analyze conversation" },
      { status: 500 }
    );
  }
}

