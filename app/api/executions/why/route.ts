import { NextResponse } from "next/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { readTargetUserId } from "@/lib/auth/readTargetUser";
import { opsLimit } from "@/lib/ops/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const execution_id = url.searchParams.get("execution_id");
    if (!execution_id) return NextResponse.json({ ok: false, error: "execution_id required" }, { status: 400 });

    const targetUserId = readTargetUserId(req);
    const gate = await requireOpsAuth({ targetUserId });
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    await opsLimit(gate.clerkUserId, "executions.why");

    const { data: execRow, error: e0 } = await getSupabaseAdminRuntimeClient()
        .from("executions")
        .select("*")
        .eq("id", execution_id)
        .eq("user_id", gate.userId)
        .single();

    if (e0) return NextResponse.json({ ok: false, error: e0.message }, { status: 500 });

    const { data: runs, error: e1 } = await getSupabaseAdminRuntimeClient()
        .from("execution_runs")
        .select("id,status,attempt,started_at,finished_at,output,error,trace_id")
        .eq("execution_id", execution_id)
        .eq("user_id", gate.userId)
        .order("started_at", { ascending: false })
        .limit(5);

    if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 500 });

    const { data: logs, error: e2 } = await getSupabaseAdminRuntimeClient()
        .from("execution_logs")
        .select("id,level,message,meta,created_at,trace_id")
        .eq("execution_id", execution_id)
        .eq("user_id", gate.userId)
        .order("created_at", { ascending: false })
        .limit(15);

    if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });

    return NextResponse.json({ ok: true, execution: execRow, runs: runs ?? [], logs: logs ?? [] });
}
