import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity/logActivity";
import { requireOpsAuth } from "@/lib/auth/opsAuth";

export async function POST(req: NextRequest) {
    // We use requireOpsAuth to get the user ID securely
    const auth = await requireOpsAuth();
    if (!auth.ok || !auth.gate) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = auth.gate.canon.userIdUuid;

    const body = await req.json().catch(() => ({}));
    const path = typeof body?.path === "string" ? body.path : null;

    if (!path) {
        return NextResponse.json({ ok: false, error: "missing path" }, { status: 400 });
    }

    await logActivity({
        userId,
        eventName: "page.view",
        source: "middleware",
        entityType: "page",
        entityId: path,
        metadata: {
            path,
            ua: req.headers.get("user-agent"),
            referer: req.headers.get("referer"),
        },
    });

    return NextResponse.json({ ok: true });
}
