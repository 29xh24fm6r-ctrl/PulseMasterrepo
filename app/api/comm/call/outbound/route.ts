// POST /api/comm/call/outbound - Initiate outbound call with user's caller ID
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createCallSession, updateCallSession } from "@/lib/comm/store";
import { twilioClient, APP_BASE_URL, TWILIO_VOICE_NUMBER } from "@/lib/comm/twilio";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { toNumber, userPhone, contactId, contactName, dealId, useCallerIdSpoof } = await request.json();
    
    if (!toNumber) {
      return NextResponse.json({ error: "toNumber is required" }, { status: 400 });
    }

    const cleanNumber = (num: string) => {
      const cleaned = num.replace(/\D/g, "");
      if (cleaned.length === 10) return `+1${cleaned}`;
      if (cleaned.startsWith("1") && cleaned.length === 11) return `+${cleaned}`;
      return `+${cleaned}`;
    };

    const formattedTo = cleanNumber(toNumber);
    const formattedUserPhone = userPhone ? cleanNumber(userPhone) : null;

    // Create call session
    const session = await createCallSession({
      clerkId: userId,
      direction: "outbound",
      fromNumber: formattedUserPhone || TWILIO_VOICE_NUMBER,
      toNumber: formattedTo,
      contactId,
      dealId,
    });

    if (!session) {
      return NextResponse.json({ error: "Failed to create call session" }, { status: 500 });
    }

    if (contactName) {
      await updateCallSession(session.id, { tags: [`contact:${contactName}`] });
    }

    const client = twilioClient();

    if (formattedUserPhone) {
      // BRIDGE MODE: Call user first, then connect to target
      const callerIdParam = useCallerIdSpoof && formattedUserPhone 
        ? `&callerId=${encodeURIComponent(formattedUserPhone)}`
        : '';
      
      const call = await client.calls.create({
        to: formattedUserPhone,
        from: TWILIO_VOICE_NUMBER,
        url: `${APP_BASE_URL}/api/comm/call/bridge?target=${encodeURIComponent(formattedTo)}&sessionId=${session.id}${callerIdParam}`,
        statusCallback: `${APP_BASE_URL}/api/comm/call/status`,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        machineDetection: "Enable",
        asyncAmd: "true",
        asyncAmdStatusCallback: `${APP_BASE_URL}/api/comm/call/status`,
      });

      await updateCallSession(session.id, { twilioCallSid: call.sid, status: "ringing" });

      return NextResponse.json({
        success: true,
        mode: "bridge",
        message: "Calling your phone first, then connecting to target",
        callSession: { ...session, twilioCallSid: call.sid, status: "ringing" },
      });
    } else {
      // DIRECT MODE (no bridge)
      const call = await client.calls.create({
        to: formattedTo,
        from: TWILIO_VOICE_NUMBER,
        url: `${APP_BASE_URL}/api/comm/call/twiml?callSessionId=${session.id}`,
        statusCallback: `${APP_BASE_URL}/api/comm/call/status`,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        record: true,
        recordingStatusCallback: `${APP_BASE_URL}/api/comm/call/recording-complete`,
        recordingStatusCallbackEvent: ["completed"],
      });

      await updateCallSession(session.id, { twilioCallSid: call.sid, status: "ringing" });

      return NextResponse.json({
        success: true,
        mode: "direct",
        callSession: { ...session, twilioCallSid: call.sid, status: "ringing" },
      });
    }
  } catch (error: any) {
    console.error("Outbound call error:", error);
    return NextResponse.json({ error: error.message || "Failed to start call" }, { status: 500 });
  }
}