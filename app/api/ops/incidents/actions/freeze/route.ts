// src/app/api/ops/incidents/actions/freeze/route.ts
import { NextResponse } from "next/server";
import { writeOpsEvent } from "@/lib/ops/incidents/writeEvent";
import { getRollbackAutoMergeFreeze, setRollbackAutoMergeFreeze } from "@/lib/ops/incidents/freeze";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Freeze/unfreeze rollback auto-merge.
 * Body: { enabled: boolean, reason?: string }
 *
 * Requires:
 * - WAR_ROOM_ADMIN_TOKEN (header x-war-room-token)
 */
export async function POST(req: Request) {
  try {
    const token = req.headers.get("x-war-room-token") || "";
    const expected = process.env.WAR_ROOM_ADMIN_TOKEN || "";

    if (!expected || token !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const enabled = Boolean(body?.enabled);
    const reason = body?.reason ? String(body.reason).slice(0, 300) : null;

    await setRollbackAutoMergeFreeze(enabled, reason);

    await writeOpsEvent({
      source: "app",
      event_type: enabled ? "operator_freeze_enabled" : "operator_freeze_disabled",
      level: enabled ? "warn" : "success",
      summary: enabled
        ? "Operator ENABLED rollback auto-merge freeze"
        : "Operator DISABLED rollback auto-merge freeze",
      payload: { enabled, reason },
    });

    const current = await getRollbackAutoMergeFreeze();
    return NextResponse.json({ ok: true, freeze: current });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}

