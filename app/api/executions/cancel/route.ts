import { NextResponse } from "next/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { opsLimit } from "@/lib/ops/limits";
import { logOpsAudit } from "@/lib/ops/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const body = await req.json();
    const { execution_id, reason, target_user_id } = body;

    if (!execution_id) return NextResponse.json({ ok: false, error: "execution_id required" }, { status: 400 });

    const gate = await requireOpsAuth({ targetUserId: target_user_id ?? null });
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    await opsLimit(gate.clerkUserId, "executions.cancel");

    await logOpsAudit({
        req,
        actorUserId: gate.clerkUserId,
        actorIsAdmin: gate.isAdmin,
        targetUserId: target_user_id ?? null,
        action: "execution.cancel",
        resourceType: "execution",
        resourceId: execution_id,
        meta: { reason: reason ?? null, scoped_user_id: gate.userId },
    });

    const { error } = await getSupabaseAdminRuntimeClient()
        .from("executions")
        .update({ status: "cancelled", last_error: reason ?? "Cancelled by user" })
        .eq("id", execution_id)
        .eq("user_id", gate.userId); // Ensure we only cancel own executions unless admin

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
