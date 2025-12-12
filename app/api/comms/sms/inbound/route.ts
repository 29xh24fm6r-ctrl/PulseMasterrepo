// SMS Inbound Webhook
// app/api/comms/sms/inbound/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ingestCommsMessage } from "@/lib/comms/ingest";

/**
 * Accept SMS webhook from Twilio or other provider
 */
export async function POST(req: NextRequest) {
  try {
    // For now, require auth. In production, you'd verify webhook signature
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Map provider payload to CommsMessageInput
    // Twilio format: { From, To, Body, MessageSid, DateSent }
    // Generic format: { from, to, body, externalId, occurredAt }
    const fromIdentity = body.From || body.from;
    const toIdentity = body.To || body.to;
    const messageBody = body.Body || body.body;
    const externalId = body.MessageSid || body.externalId || body.messageId;
    const occurredAt = body.DateSent
      ? new Date(body.DateSent)
      : body.occurredAt
      ? new Date(body.occurredAt)
      : new Date();

    if (!fromIdentity || !toIdentity || !messageBody) {
      return NextResponse.json(
        { error: "Missing required fields: from, to, body" },
        { status: 400 }
      );
    }

    // Determine direction (if toIdentity matches user's number, it's incoming)
    // For now, assume incoming if not explicitly set
    const direction = body.direction || "incoming";

    const commMessageId = await ingestCommsMessage({
      userId,
      channelType: "sms",
      externalId,
      fromIdentity,
      toIdentity,
      occurredAt,
      subject: null,
      body: messageBody,
      rawData: body,
      direction: direction as "incoming" | "outgoing",
    });

    return NextResponse.json({ success: true, commMessageId });
  } catch (err: any) {
    console.error("[SMSInbound] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process SMS" },
      { status: 500 }
    );
  }
}

