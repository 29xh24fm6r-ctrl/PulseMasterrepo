// POST /api/comm/call/voicemail-complete - Handle voicemail recording complete
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { updateCallSession, updateCallSessionBySid } from "@/services/comm/store";
import { VoiceResponse } from "@/services/twilio";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const formData = await request.formData();

    const callSessionId = url.searchParams.get("callSessionId");
    const callSid = formData.get("CallSid") as string;
    const recordingUrl = formData.get("RecordingUrl") as string;
    const recordingDuration = formData.get("RecordingDuration") as string;

    console.log(`📝 Voicemail complete for session: ${callSessionId || callSid}`);

    // Update session with voicemail status and transcript placeholder
    const updates = {
      status: "voicemail" as const,
      transcriptText: `Voicemail recording: ${recordingUrl}.mp3`,
      endedAt: new Date().toISOString(),
      durationSec: parseInt(recordingDuration) || 0,
    };

    // Try to update by session ID first, then by Twilio SID
    if (callSessionId) {
      await updateCallSession(callSessionId, updates);
    } else if (callSid) {
      await updateCallSessionBySid(callSid, updates);
    }

    // Return TwiML per spec
    const twiml = new VoiceResponse();
    twiml.say({ voice: "alice" }, "Thank you. Your message has been recorded.");
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: any) {
    console.error("Voicemail complete error:", error);

    const twiml = new VoiceResponse();
    twiml.say({ voice: "alice" }, "Thank you.");
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }
}