import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { readTargetUserId } from "@/lib/auth/readTargetUser";
import { opsLimit } from "@/lib/ops/limits";
import { logOpsAudit } from "@/lib/ops/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const trace_id = url.searchParams.get("trace_id");
    const execution_id = url.searchParams.get("execution_id");

    if (!trace_id && !execution_id) {
        return NextResponse.json({ ok: false, error: "trace_id or execution_id required" }, { status: 400 });
    }

    const targetUserId = readTargetUserId(req);
    const gate = await requireOpsAuth({ targetUserId });
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    await opsLimit(gate.clerkUserId, "ops.blast_radius");

    await logOpsAudit({
        req,
        actorUserId: gate.clerkUserId,
        actorIsAdmin: gate.isAdmin,
        targetUserId: targetUserId ?? null,
        action: "ops.blast_radius.view",
        resourceType: trace_id ? "trace" : "execution",
        resourceId: trace_id ?? execution_id ?? null,
        meta: { scoped_user_id: gate.userId },
    });

    // Resolve trace_id from execution_id if needed
    let resolvedTraceId = trace_id ?? null;

    if (!resolvedTraceId && execution_id) {
        const { data: runs } = await supabaseAdmin
            .from("execution_runs")
            .select("trace_id")
            .eq("user_id", gate.userId)
            .eq("execution_id", execution_id)
            .order("started_at", { ascending: false })
            .limit(1);

        resolvedTraceId = runs?.[0]?.trace_id ?? null;
    }

    // Links (provenance graph)
    let links: any[] = [];
    if (resolvedTraceId) {
        const { data } = await supabaseAdmin
            .from("artifact_links")
            .select("id,from_type,from_id,from_key,relation,meta,to_type,to_id,to_key,created_at,trace_id,execution_id,execution_run_id")
            .eq("user_id", gate.userId)
            .eq("trace_id", resolvedTraceId)
            .order("created_at", { ascending: true })
            .limit(1000);

        links = data ?? [];
    }

    // Artifacts by trace_id (best-effort; tables may not exist)
    let evidence: any[] = [];
    let tasks: any[] = [];
    let outbox: any[] = [];

    if (resolvedTraceId) {
        const e1 = await supabaseAdmin
            .from("life_evidence")
            .select("id,evidence_type,created_at,trace_id")
            .eq("user_id", gate.userId)
            .eq("trace_id", resolvedTraceId)
            .order("created_at", { ascending: true })
            .limit(300);
        if (!e1.error) evidence = e1.data ?? [];

        const t1 = await supabaseAdmin
            .from("tasks")
            .select("id,title,status,created_at,trace_id")
            .eq("user_id", gate.userId)
            .eq("trace_id", resolvedTraceId)
            .order("created_at", { ascending: true })
            .limit(300);
        if (!t1.error) tasks = t1.data ?? [];

        const o1 = await supabaseAdmin
            .from("email_outbox")
            .select("id,to_email,subject,status,created_at,trace_id")
            .eq("user_id", gate.userId)
            .eq("trace_id", resolvedTraceId)
            .order("created_at", { ascending: true })
            .limit(300);
        if (!o1.error) outbox = o1.data ?? [];
    }

    return NextResponse.json({
        ok: true,
        trace_id: resolvedTraceId,
        execution_id: execution_id ?? null,
        links,
        artifacts: { evidence, tasks, outbox },
    });
}
