// POST /api/comm/call/transcribe - Transcribe and analyze call, save to Second Brain
import { NextResponse } from "next/server";
import { transcribeCall } from "@/lib/comm/transcribe";

export async function POST(request: Request) {
  try {
    const { sessionId, recordingUrl } = await request.json();

    if (!sessionId || !recordingUrl) {
      return NextResponse.json({ error: "Missing sessionId or recordingUrl" }, { status: 400 });
    }

    // ✅ Use shared function instead of inline logic
    const result = await transcribeCall(sessionId, recordingUrl);

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Transcription failed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      transcriptText: result.transcriptText,
      analysis: result.analysis,
      savedToBrain: result.savedToBrain,
    });

  } catch (error: any) {
    console.error("Transcription error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
