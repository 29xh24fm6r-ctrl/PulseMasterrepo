import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { enqueueDailyActivityRollupRefresh } from "@/lib/jobs/enqueueDailyActivityRollup";

export const runtime = "nodejs";

export async function POST(req: Request) {
    const gate = await requireOpsAuth(req as any);
    if (!gate.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // default: refresh last 30 days for all users
    await enqueueDailyActivityRollupRefresh({ user_id_uuid: null, days: 30 });

    return NextResponse.json({ ok: true });
}
