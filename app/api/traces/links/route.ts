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
    const trace_id = url.searchParams.get("trace_id");
    const limit = Number(url.searchParams.get("limit") ?? 250);

    if (!trace_id) return NextResponse.json({ ok: false, error: "trace_id required" }, { status: 400 });

    const targetUserId = readTargetUserId(req);
    const gate = await requireOpsAuth({ targetUserId });
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    await opsLimit(gate.clerkUserId, "traces.links");

    await logOpsAudit({
        req,
        actorUserId: gate.clerkUserId,
        actorIsAdmin: gate.isAdmin,
        targetUserId: targetUserId ?? null,
        action: "trace.links",
        resourceType: "trace",
        resourceId: trace_id,
        meta: { limit, scoped_user_id: gate.userId },
    });

    const { data, error } = await getSupabaseAdminRuntimeClient()
        .from("artifact_links")
        .select("id,trace_id,execution_id,execution_run_id,from_type,from_id,from_key,relation,meta,to_type,to_id,to_key,created_at")
        .eq("user_id", gate.userId)
        .eq("trace_id", trace_id)
        .order("created_at", { ascending: true })
        .limit(Math.min(1000, Math.max(1, limit)));

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, trace_id, links: data ?? [], scoped_user_id: gate.userId });
}
