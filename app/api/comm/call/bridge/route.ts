// GET/POST /api/comm/call/bridge - Bridge user to target number with their caller ID
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { VoiceResponse, APP_BASE_URL, TWILIO_VOICE_NUMBER } from "@/services/twilio";

export async function GET(request: Request) {
  return handleBridge(request);
}

export async function POST(request: Request) {
  return handleBridge(request);
}

async function handleBridge(request: Request) {
  try {
    const url = new URL(request.url);
    const target = url.searchParams.get("target");
    const sessionId = url.searchParams.get("sessionId");
    const callerId = url.searchParams.get("callerId");

    console.log(`📞 Bridge: Connecting to ${target} as ${callerId || 'Twilio number'}`);

    if (!target) {
      const twiml = new VoiceResponse();
      twiml.say({ voice: "Polly.Matthew" }, "No target number provided.");
      twiml.hangup();
      return new NextResponse(twiml.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const twiml = new VoiceResponse();

    // Brief message

    // Dial with optimized quality settings
    const dial = twiml.dial({
      callerId: callerId || TWILIO_VOICE_NUMBER,
      answerOnBridge: true, // Reduces latency - audio starts when other party answers
      ringTone: "us", // Play US ringback tone
      timeout: 30, // 30 second timeout
      // Recording settings - use single channel for better quality
      record: "record-from-ringing",
      recordingStatusCallback: `${APP_BASE_URL}/api/comm/call/recording-complete?sessionId=${sessionId}`,
      recordingStatusCallbackEvent: ["completed"],
      action: `${APP_BASE_URL}/api/comm/call/complete?sessionId=${sessionId}`,
    });

    // Add the target number with quality hints
    dial.number({
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallback: `${APP_BASE_URL}/api/comm/call/status?sessionId=${sessionId}`,
    }, target);

    const twimlStr = twiml.toString();
    console.log("TwiML:", twimlStr);

    return new NextResponse(twimlStr, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: any) {
    console.error("Bridge error:", error);

    const twiml = new VoiceResponse();
    twiml.say({ voice: "Polly.Matthew" }, "Sorry, there was an error connecting your call.");
    twiml.hangup();
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
