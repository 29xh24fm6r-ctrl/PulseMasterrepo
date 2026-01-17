import { NextResponse } from "next/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { readTargetUserId } from "@/lib/auth/readTargetUser";
import { opsLimit } from "@/lib/ops/limits";
import { logOpsAudit } from "@/lib/ops/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const kind = url.searchParams.get("kind");
    const baseline_days = Number(url.searchParams.get("baseline_days") ?? 7);
    const recent_hours = Number(url.searchParams.get("recent_hours") ?? 6);

    const targetUserId = readTargetUserId(req);
    const gate = await requireOpsAuth({ targetUserId });
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    await opsLimit(gate.clerkUserId, "ops.drift");

    await logOpsAudit({
        req,
        actorUserId: gate.clerkUserId,
        actorIsAdmin: gate.isAdmin,
        targetUserId: targetUserId ?? null,
        action: "ops.drift.view",
        resourceType: "execution_kind",
        resourceId: kind ?? null,
        meta: { baseline_days, recent_hours, scoped_user_id: gate.userId },
    });

    const { data, error } = await getSupabaseAdminRuntimeClient().rpc("rpc_execution_drift_radar", {
        p_user_id: gate.userId,
        p_kind: kind ?? null,
        p_baseline_days: Math.min(30, Math.max(1, baseline_days)),
        p_recent_hours: Math.min(48, Math.max(1, recent_hours)),
    });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, items: data ?? [] });
}
