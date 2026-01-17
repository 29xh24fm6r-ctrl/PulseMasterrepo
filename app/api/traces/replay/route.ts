import { NextResponse } from "next/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { linkArtifact } from "@/lib/executions/artifactLinks";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { internalPost } from "@/lib/executions/internalApi";
import { opsLimit } from "@/lib/ops/limits";
import { logOpsAudit } from "@/lib/ops/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const body = await req.json();
    const { trace_id, target_user_id, dry_run, mode } = body;

    if (!trace_id) return NextResponse.json({ ok: false, error: "trace_id required" }, { status: 400 });

    const gate = await requireOpsAuth({ targetUserId: target_user_id ?? null });
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    await opsLimit(gate.clerkUserId, "traces.replay");

    await logOpsAudit({
        req,
        actorUserId: gate.clerkUserId,
        actorIsAdmin: gate.isAdmin,
        targetUserId: (body?.target_user_id ?? null),
        action: "trace.replay",
        resourceType: "trace",
        resourceId: trace_id,
        meta: { dry_run: Boolean(dry_run ?? true), mode: mode ?? "enqueue_only", scoped_user_id: gate.userId },
    });

    const replayMode: "enqueue_only" | "enqueue_and_run_one" =
        mode === "enqueue_and_run_one" ? "enqueue_and_run_one" : "enqueue_only";

    const dryRun = Boolean(dry_run ?? true); // SAFE DEFAULT

    const { data: runs, error: e1 } = await getSupabaseAdminRuntimeClient()
        .from("execution_runs")
        .select("execution_id,trace_id,started_at")
        .eq("user_id", gate.userId)
        .eq("trace_id", trace_id)
        .order("started_at", { ascending: true });

    if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 500 });
    if (!runs || runs.length === 0) return NextResponse.json({ ok: false, error: "no runs found for trace" }, { status: 404 });

    const execIds = Array.from(new Set(runs.map((r: any) => r.execution_id)));

    const { data: execs, error: e2 } = await getSupabaseAdminRuntimeClient()
        .from("executions")
        .select("id,kind,payload,priority,max_attempts")
        .eq("user_id", gate.userId)
        .in("id", execIds);

    if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });

    const replayNonce = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

    const inserted: any[] = [];
    for (const ex of execs ?? []) {
        const newPayload = {
            ...(ex.payload ?? {}),
            userId: gate.userId,
            dryRun,
            replayOfTraceId: trace_id,
            replayOfExecutionId: ex.id,
            replayNonce,
        };

        const dedupe_key = `replay.${trace_id}.${ex.id}.${replayNonce} `;

        const { data: created, error: e3 } = await getSupabaseAdminRuntimeClient()
            .from("executions")
            .insert({
                user_id: gate.userId,
                kind: ex.kind,
                payload: newPayload,
                run_at: new Date().toISOString(),
                priority: ex.priority ?? 0,
                dedupe_key,
                max_attempts: ex.max_attempts ?? 5,
                status: "queued",
            })
            .select("id")
            .single();

        if (e3) return NextResponse.json({ ok: false, error: e3.message }, { status: 500 });

        inserted.push({ original_execution_id: ex.id, new_execution_id: created.id, kind: ex.kind, dryRun });

        await linkArtifact({
            userId: gate.userId,
            traceId: trace_id,
            fromType: "trace",
            fromKey: trace_id,
            relation: "replayed_as",
            meta: { dryRun, replayNonce },
            toType: "execution",
            toId: created.id,
        });

        await linkArtifact({
            userId: gate.userId,
            traceId: trace_id,
            fromType: "execution",
            fromId: ex.id,
            relation: "replay_copy_of",
            meta: { dryRun, replayNonce },
            toType: "execution",
            toId: created.id,
        });
    }

    let ranWorker: any = null;
    if (replayMode === "enqueue_and_run_one") {
        ranWorker = await fetch(new URL("/api/executions/worker", req.url), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ user_id: gate.userId }),
        }).then((r) => r.json()).catch((e) => ({ ok: false, error: String(e) }));
    }

    return NextResponse.json({ ok: true, trace_id, dryRun, replayNonce, inserted, ranWorker, scoped_user_id: gate.userId });
}
