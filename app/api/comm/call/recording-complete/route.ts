// POST /api/comm/call/recording-complete - Handle completed recording
import { NextResponse } from "next/server";
import { updateCallSessionBySid, updateCallSession } from "@/lib/comm/store";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    const formData = await request.formData();
    
    const callSid = formData.get("CallSid") as string;
    const recordingUrl = formData.get("RecordingUrl") as string;
    const recordingDuration = formData.get("RecordingDuration") as string;
    const recordingSid = formData.get("RecordingSid") as string;

    console.log(`🎙️ Recording complete: ${recordingSid} (${recordingDuration}s)`);
    console.log(`📼 Recording URL: ${recordingUrl}`);

    const updates: any = {
      durationSec: parseInt(recordingDuration) || 0,
    };

    if (recordingUrl) {
      updates.transcriptText = `Recording available: ${recordingUrl}.mp3`;
    }

    if (sessionId) {
      await updateCallSession(sessionId, updates);
      triggerTranscription(sessionId, `${recordingUrl}.mp3`);
    } else if (callSid) {
      await updateCallSessionBySid(callSid, updates);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Recording complete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function triggerTranscription(sessionId: string, recordingUrl: string) {
  try {
    console.log(`🎤 Triggering transcription for ${sessionId}`);
    
    // ✅ Use shared function instead of HTTP call
    const { transcribeCall } = await import("@/lib/comm/transcribe");
    await transcribeCall(sessionId, recordingUrl).catch(err => 
      console.error("Transcription request failed:", err)
    );
    
  } catch (error) {
    console.error("Failed to trigger transcription:", error);
  }
}
