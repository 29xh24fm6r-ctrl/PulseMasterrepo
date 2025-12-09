// POST /api/comm/call/complete - Handle call completion
import { NextResponse } from "next/server";
import { updateCallSession } from "@/lib/comm/store";
import { VoiceResponse } from "@/lib/comm/twilio";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    const formData = await request.formData();
    
    const dialCallStatus = formData.get("DialCallStatus") as string;
    const dialCallDuration = formData.get("DialCallDuration") as string;

    console.log(`📞 Call complete: ${sessionId} - Status: ${dialCallStatus}`);

    if (sessionId) {
      await updateCallSession(sessionId, {
        status: dialCallStatus === "completed" ? "completed" : "failed",
        endedAt: new Date().toISOString(),
        durationSec: parseInt(dialCallDuration) || 0,
      });
    }

    // Return empty TwiML (call is done)
    const twiml = new VoiceResponse();
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: any) {
    console.error("Call complete error:", error);
    const twiml = new VoiceResponse();
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
