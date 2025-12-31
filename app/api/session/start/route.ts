import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { logActivity } from "@/lib/activity/logActivity";

export async function POST(req: Request) {
    const auth = await requireOpsAuth();
    const userId = auth.gate.canon.userIdUuid;

    const body = await req.json().catch(() => ({}));
    const { sessionId, note } = body;

    const eventId = await logActivity({
        userId,
        eventName: "session.started",
        source: "api",
        entityType: "session",
        entityId: sessionId ?? "manual",
        metadata: { note }
    });

    return NextResponse.json({ ok: true, activityId: eventId });
}
