// POST /api/comm/call/save-to-brain - Save call transcript and analysis to Second Brain (interactions)
import { NextResponse } from "next/server";
import { saveCallToBrain } from "@/lib/comm/save-to-brain";

export async function POST(request: Request) {
  try {
    const { callSessionId, contactId } = await request.json();

    if (!callSessionId) {
      return NextResponse.json({ error: "callSessionId required" }, { status: 400 });
    }

    // ✅ Use shared function instead of inline logic
    const result = await saveCallToBrain(callSessionId, contactId);

    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      interactionId: result.interactionId,
      contactId: result.contactId,
      followUpsCreated: result.followUpsCreated || 0,
    });

  } catch (err: any) {
    console.error("Save to brain error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
