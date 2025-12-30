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
    if (!trace_id) return NextResponse.json({ ok: false, error: "trace_id required" }, { status: 400 });

    const targetUserId = readTargetUserId(req);
    const gate = await requireOpsAuth({ targetUserId });
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    await opsLimit(gate.clerkUserId, "traces.get");

    await logOpsAudit({
        req,
        actorUserId: gate.clerkUserId,
        actorIsAdmin: gate.isAdmin,
        targetUserId: targetUserId ?? null,
        action: "trace.view",
        resourceType: "trace",
        resourceId: trace_id,
        meta: { scoped_user_id: gate.userId },
    });

    const { data: runs, error: e1 } = await supabaseAdmin
        .from("execution_runs")
        .select("id,execution_id,status,attempt,started_at,finished_at,output,error,trace_id")
        .eq("user_id", gate.userId)
        .eq("trace_id", trace_id)
        .order("started_at", { ascending: true });

    if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 500 });

    const execIds = Array.from(new Set((runs ?? []).map((r: any) => r.execution_id)));

    const { data: execs, error: e2 } = await supabaseAdmin
        .from("executions")
        .select("id,kind,payload,run_at,priority,status,attempts,max_attempts,last_error,dedupe_key,created_at,updated_at")
        .eq("user_id", gate.userId)
        .in("id", execIds.length ? execIds : ["00000000-0000-0000-0000-000000000000"]);

    if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });

    const { data: logs, error: e3 } = await supabaseAdmin
        .from("execution_logs")
        .select("id,execution_id,level,message,meta,created_at,trace_id")
        .eq("user_id", gate.userId)
        .eq("trace_id", trace_id)
        .order("created_at", { ascending: true });

    if (e3) return NextResponse.json({ ok: false, error: e3.message }, { status: 500 });

    return NextResponse.json({
        ok: true,
        trace_id,
        executions: execs ?? [],
        runs: runs ?? [],
        logs: logs ?? [],
        scoped_user_id: gate.userId,
        is_admin: gate.isAdmin,
    });
}
