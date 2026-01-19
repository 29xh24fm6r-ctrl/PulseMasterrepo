// POST /api/comm/call/outbound - Initiate outbound call with user's caller ID
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { auth } from "@clerk/nextjs/server";
import { createCallSession, updateCallSession } from "@/services/comm/store";
import { twilioClient, APP_BASE_URL, TWILIO_VOICE_NUMBER, startOutboundCall } from "@/services/twilio";
import { ExecutionGate } from "@/lib/execution/ExecutionGate";
import { ExecutionIntentType } from "@/lib/execution/ExecutionIntent";
import { createClient } from "@/lib/supabase/server";

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

    // HUMAN AGENCY WIRING
    // 1. Persist Confirmation (Implicit for UI Action)
    const supabase = createClient();
    const intent = ExecutionIntentType.SEND_MESSAGE;

    // Check if we need to insert or if it's already there? 
    // For direct API, we insert a fresh confirmation as "UI" source.
    const { error: confirmError } = await supabase
      .from("execution_confirmations")
      .insert({
        user_id: userId,
        intent_type: intent,
        confirmed_at: new Date().toISOString(),
        source: "ui",
        trust_level: "HIGH"
      });

    if (confirmError) throw new Error("Failed to persist execution confirmation");

    // 2. Request Token
    const token = await ExecutionGate.request(userId, intent, {
      confidenceScore: 1.0,
      recentRejections: 0,
      mode: "NORMAL"
    });

    if (formattedUserPhone) {
      // BRIDGE MODE: Call user first, then connect to target
      const callerIdParam = useCallerIdSpoof && formattedUserPhone
        ? `&callerId=${encodeURIComponent(formattedUserPhone)}`
        : '';

      // Use the Gate-protected function
      const call = await startOutboundCall(token, {
        toNumber: formattedUserPhone,
        callbackUrl: `${APP_BASE_URL}/api/comm/call/bridge?target=${encodeURIComponent(formattedTo)}&sessionId=${session.id}${callerIdParam}`,
        statusCallbackUrl: `${APP_BASE_URL}/api/comm/call/status`,
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
      const call = await startOutboundCall(token, {
        toNumber: formattedTo,
        callbackUrl: `${APP_BASE_URL}/api/comm/call/twiml?callSessionId=${session.id}`,
        statusCallbackUrl: `${APP_BASE_URL}/api/comm/call/status`,
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