// GET/POST /api/comm/call/twiml - Return TwiML for outbound call
import { NextResponse } from "next/server";
import { VoiceResponse } from "@/lib/comm/twilio";

export async function GET(request: Request) {
  return handleTwiml(request);
}

export async function POST(request: Request) {
  return handleTwiml(request);
}

async function handleTwiml(request: Request) {
  try {
    const url = new URL(request.url);
    const callSessionId = url.searchParams.get("callSessionId");

    console.log(`📞 TwiML requested for session: ${callSessionId}`);

    // Silent TwiML - just keeps the call alive
    const twiml = new VoiceResponse();
    
    // Keep the call open for 5 minutes (300 seconds) of silence
    // This allows a normal phone conversation
    twiml.pause({ length: 300 });

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });

  } catch (error: any) {
    console.error("TwiML error:", error);
    
    const twiml = new VoiceResponse();
    twiml.say({ voice: "alice" }, "Sorry, there was an error.");
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
