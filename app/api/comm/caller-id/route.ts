// GET/POST /api/comm/caller-id - Manage verified caller IDs
import { NextResponse } from "next/server";
import { twilioClient } from "@/lib/comm/twilio";

export async function GET() {
  try {
    const client = twilioClient();
    const callerIds = await client.outgoingCallerIds.list({ limit: 20 });
    return NextResponse.json({
      callerIds: callerIds.map(c => ({
        sid: c.sid,
        phoneNumber: c.phoneNumber,
        friendlyName: c.friendlyName,
      })),
    });
  } catch (error: any) {
    console.error("List caller IDs error:", error);
    return NextResponse.json({ callerIds: [] });
  }
}

export async function POST(request: Request) {
  try {
    const { phoneNumber, friendlyName } = await request.json();
    if (!phoneNumber) {
      return NextResponse.json({ error: "phoneNumber required" }, { status: 400 });
    }

    const cleaned = phoneNumber.replace(/\D/g, "");
    const formatted = cleaned.length === 10 ? `+1${cleaned}` : `+${cleaned}`;

    const client = twilioClient();
    const validation = await client.validationRequests.create({
      phoneNumber: formatted,
      friendlyName: friendlyName || "Pulse User",
    });

    return NextResponse.json({
      success: true,
      message: "Answer your phone and enter the code!",
      validationCode: validation.validationCode,
    });
  } catch (error: any) {
    if (error.code === 21450) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }
    console.error("Verify error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
