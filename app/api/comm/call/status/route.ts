// POST /api/comm/call/status - Twilio call status updates
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { updateCallSessionBySid } from "@/services/comm/store";
import { CallStatus } from "@/services/comm/types";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;
    const callDuration = formData.get("CallDuration") as string;

    console.log(`📞 Status update: ${callSid} -> ${callStatus}`);

    // Map Twilio statuses to internal statuses per spec
    const statusMap: Record<string, CallStatus> = {
      "queued": "initiating",
      "initiated": "initiating",
      "ringing": "ringing",
      "in-progress": "in_progress",
      "completed": "completed",
      "busy": "failed",
      "failed": "failed",
      "no-answer": "missed",
      "canceled": "failed",
    };

    const status = statusMap[callStatus] || "completed";

    // Build update object
    const updates: Partial<{ status: CallStatus; endedAt: string; durationSec: number }> = {
      status,
    };

    // Add end time and duration for terminal statuses
    if (["completed", "failed", "busy", "no-answer", "canceled"].includes(callStatus)) {
      updates.endedAt = new Date().toISOString();
      if (callDuration) {
        updates.durationSec = parseInt(callDuration);
      }
    }

    // Update the call session
    const session = await updateCallSessionBySid(callSid, updates);

    if (session) {
      console.log(`📞 Call ${callSid} updated to ${status}`);
    } else {
      console.log(`📞 Call ${callSid} not found in store`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Status callback error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
