import { NextResponse } from "next/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { readTargetUserId } from "@/lib/auth/readTargetUser";
import { opsLimit } from "@/lib/ops/limits";
import { logOpsAudit } from "@/lib/ops/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const targetUserId = readTargetUserId(req);
    const gate = await requireOpsAuth({ targetUserId });
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    await opsLimit(gate.clerkUserId, "ops.audit");

    // No recursive audit logging for audit view to avoid noise, or log simplified
    // await logOpsAudit({...}) - skipping to avoid noise

    const { data, error } = await getSupabaseAdminRuntimeClient()
        .from("ops_audit_log")
        .select("*")
        .eq("user_id", gate.userId) // RLS-like filtering for safety, though ops is conceptually cross-user if super-admin. 
        // But current opsAuth defaults to self unless impersonating. 
        // If impersonating targetUserId, showing that user's audit log makes sense.
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, items: data });
}
