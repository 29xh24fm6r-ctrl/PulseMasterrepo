// Call Summary Inbound
// app/api/comms/call/summary/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ingestCommsMessage } from "@/lib/comms/ingest";

/**
 * Accept call transcription or summary
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Expected format:
    // { from, to, transcript/summary, externalId, occurredAt, direction, subject? }
    const fromIdentity = body.from;
    const toIdentity = body.to;
    const transcript = body.transcript || body.summary || body.body;
    const externalId = body.externalId || body.callId;
    const occurredAt = body.occurredAt ? new Date(body.occurredAt) : new Date();
    const direction = body.direction || "incoming";
    const subject = body.subject || body.title || null;

    if (!fromIdentity || !toIdentity || !transcript) {
      return NextResponse.json(
        { error: "Missing required fields: from, to, transcript/summary" },
        { status: 400 }
      );
    }

    const commMessageId = await ingestCommsMessage({
      userId,
      channelType: "call",
      externalId,
      fromIdentity,
      toIdentity,
      occurredAt,
      subject,
      body: transcript,
      rawData: body,
      direction: direction as "incoming" | "outgoing",
    });

    return NextResponse.json({ success: true, commMessageId });
  } catch (err: any) {
    console.error("[CallSummary] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process call summary" },
      { status: 500 }
    );
  }
}

