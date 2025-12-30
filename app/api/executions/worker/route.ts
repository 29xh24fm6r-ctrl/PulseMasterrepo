import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { runExecution } from "@/lib/executions/handlers";
import { execLog } from "@/lib/executions/logger";
import type { ExecutionJob } from "@/lib/executions/kinds";
import { randomUUID } from "node:crypto";
import { linkArtifact } from "@/lib/executions/artifactLinks";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { opsLimit } from "@/lib/ops/limits";
import { logOpsAudit } from "@/lib/ops/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * This worker is intentionally "pull-based":
 * - You can trigger it from UI, cron, or a server scheduler.
 * - It claims exactly one eligible execution per call (simple + safe).
 */
export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const targetUserId = body?.target_user_id ?? null;

    const gate = await requireOpsAuth({ targetUserId });
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    await opsLimit(gate.clerkUserId, "executions.worker");

    await logOpsAudit({
        req,
        actorUserId: gate.clerkUserId,
        actorIsAdmin: gate.isAdmin,
        targetUserId: targetUserId ?? null,
        action: "executions.worker.run",
        resourceType: "execution",
        meta: { scoped_user_id: gate.userId },
    });

    // ✅ IMPORTANT: Everywhere you previously used body.user_id, use gate.userId now
    const user_id = gate.userId;

    // 1) Find an eligible queued execution for this user (server-side because admin bypasses RLS)
    const now = new Date().toISOString();

    const { data: candidates, error: e0 } = await supabaseAdmin
        .from("executions")
        .select("*")
        .eq("user_id", user_id)
        .eq("status", "queued")
        .lte("run_at", now)
        .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
        .order("priority", { ascending: false })
        .order("run_at", { ascending: true })
        .limit(10);

    if (e0) return NextResponse.json({ ok: false, error: e0.message }, { status: 500 });
    if (!candidates || candidates.length === 0) return NextResponse.json({ ok: true, ran: false });

    // 2) Attempt to "claim" one candidate optimistically (status transition)
    // NOTE: DB RPC claim_next uses SKIP LOCKED but relies on auth.uid(). We'll do it server-side here.
    const pick = candidates[0];

    const { data: claimed, error: e1 } = await supabaseAdmin
        .from("executions")
        .update({ status: "claimed" })
        .eq("id", pick.id)
        .eq("user_id", user_id)
        .eq("status", "queued")
        .select("*")
        .single();

    if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 500 });
    if (!claimed) return NextResponse.json({ ok: true, ran: false });

    // 3) Start run (attempt++, create execution_run)
    const attempt = Number(claimed.attempts ?? 0) + 1;

    await supabaseAdmin.from("executions").update({ status: "running", attempts: attempt }).eq("id", claimed.id).eq("user_id", user_id);
    // 3. Insert run record
    const traceId = randomUUID();
    const { data: runRow, error: runErr } = await supabaseAdmin
        .from("execution_runs")
        .insert({
            user_id,
            execution_id: claimed.id,
            status: "running",
            attempt,
            trace_id: traceId,
            output: {},
        })
        .select("id")
        .single();

    if (runErr || !runRow) {
        // If run creation failed, we can't do much but release the claim
        // But realistically, this shouldn't fail if PG is up.
        // Release claimed row
        await supabaseAdmin.from("executions").update({ status: "pending", locked_until: null }).eq("id", claimed.id);
        return NextResponse.json({ ok: false, error: "Failed to create run record" }, { status: 500 });
    }

    // LINK THE ARTIFACTS
    await linkArtifact({
        userId: user_id,
        traceId,
        executionId: claimed.id,
        executionRunId: runRow.id,
        fromType: "execution",
        fromId: claimed.id,
        relation: "spawned",
        toType: "execution_run",
        toId: runRow.id,
    });

    await linkArtifact({
        userId: user_id,
        traceId,
        executionId: claimed.id,
        executionRunId: runRow.id,
        fromType: "execution_run",
        fromId: runRow.id,
        relation: "has_trace",
        toType: "trace",
        toKey: traceId,
    });

    // 3. Log worker start
    await execLog({
        userId: user_id,
        executionId: claimed.id,
        traceId,
        message: "worker:claimed",
        meta: { kind: claimed.kind, run_at: claimed.run_at, priority: claimed.priority },
    });

    await execLog({
        userId: user_id,
        executionId: claimed.id,
        traceId,
        message: "worker:run_started",
        meta: { run_id: runRow.id, attempt },
    });

    // 4) Execute
    const job: ExecutionJob = {
        id: claimed.id,
        kind: claimed.kind,
        payload: { ...(claimed.payload ?? {}), userId: user_id, traceId }, // ensure userId injected
        run_at: claimed.run_at,
        priority: claimed.priority ?? 0,
        attempts: attempt,
        max_attempts: claimed.max_attempts ?? 5,
    } as any;

    const result = await runExecution(job);

    // 5) Finish run + update execution
    const maxAttempts = Number(claimed.max_attempts ?? 5);

    if (result.ok) {
        // Success
        await supabaseAdmin
            .from("executions")
            .update({ status: "succeeded" })
            .eq("id", claimed.id);

        await supabaseAdmin
            .from("execution_runs")
            .update({ status: "succeeded", finished_at: new Date().toISOString(), output: result.output ?? {}, error: null })
            .eq("id", runRow.id);

        await execLog({
            userId: user_id,
            executionId: claimed.id,
            traceId,
            message: "worker:succeeded",
            meta: { run_id: runRow.id },
        });

        return NextResponse.json({ ok: true, output: result.output });
    } else {
        // Failure
        const err = result.error;
        let status = "failed";
        let nextRetryAt = null;

        if (attempt < maxAttempts) {
            status = "queued"; // retry
            // simple exp backoff: 2s, 4s, 8s...
            const delaySec = 2 * Math.pow(2, attempt - 1);
            nextRetryAt = new Date(Date.now() + delaySec * 1000).toISOString();
        }

        await supabaseAdmin
            .from("executions")
            .update({
                status,
                next_retry_at: nextRetryAt,
                last_error: err,
            })
            .eq("id", claimed.id);

        await supabaseAdmin
            .from("execution_runs")
            .update({ status: "failed", finished_at: new Date().toISOString(), error: err })
            .eq("id", runRow.id);

        await execLog({
            userId: user_id,
            executionId: claimed.id,
            traceId,
            level: "error",
            message: "worker:failed",
            meta: {
                run_id: runRow.id,
                attempt,
                error: err,
                next_retry_at: attempt >= maxAttempts ? null : nextRetryAt,
            },
        });

        return NextResponse.json({ ok: false, error: err });
    }
}
