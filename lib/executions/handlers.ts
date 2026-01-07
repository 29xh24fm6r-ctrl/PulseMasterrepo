import type { ExecutionJob } from "./kinds";
import { internalPost } from "./internalApi";
import { supabaseAdmin } from "@/lib/supabase";
import { computeQuestCheckpoint } from "@/lib/quests/evaluate";
import { execLog } from "./logger";
import { withExecStep } from "./withLogs";

type ExecCtx = {
    userId: string;
    executionId: string;
};

async function logStart(ctx: ExecCtx, job: ExecutionJob) {
    await execLog({
        userId: ctx.userId,
        executionId: ctx.executionId,
        message: "execution:start",
        meta: {
            kind: job.kind,
            priority: job.priority,
            attempts: job.attempts,
            max_attempts: job.max_attempts,
            run_at: job.run_at,
            payload_keys: Object.keys(job.payload ?? {}),
        },
    });
}

async function logFinish(ctx: ExecCtx, status: "succeeded" | "failed", meta?: Record<string, any>) {
    await execLog({
        userId: ctx.userId,
        executionId: ctx.executionId,
        level: status === "failed" ? "error" : "info",
        message: `execution:${status}`,
        meta: meta ?? {},
    });
}

/**
 * Execution handlers must be:
 * - idempotent (safe to retry)
 * - auditable (return output)
 * - bounded (do not do unlimited work in a single execution)
 */
export async function runExecution(
    job: ExecutionJob
): Promise<{ ok: true; output?: any } | { ok: false; error: string; output?: any }> {
    const userId = String(job.payload?.userId ?? "");
    const executionId = job.id;
    const traceId = (job.payload?.traceId ? String(job.payload.traceId) : null) as string | null;
    const executionRunId = (job.payload?.executionRunId ? String(job.payload.executionRunId) : null) as string | null;
    const dryRun = Boolean(job.payload?.dryRun ?? false);

    if (!userId) {
        // We cannot log without userId; return hard error.
        return { ok: false, error: "userId required in payload" };
    }

    const ctx: ExecCtx = { userId, executionId };
    await logStart(ctx, job);

    try {
        switch (job.kind) {
            case "email.flush": {
                const limit = Number(job.payload?.limit ?? 25);

                if (dryRun) {
                    await execLog({ userId, executionId, traceId, level: "warn", message: "dry_run:skip email.flush", meta: { limit } });
                    await logFinish(ctx, "succeeded", { kind: job.kind, dryRun, skipped: true });
                    return { ok: true, output: { dryRun: true, skipped: "email.flush", limit } };
                }

                await execLog({
                    userId,
                    executionId,
                    traceId,
                    message: "email.flush:begin",
                    meta: { limit },
                });

                const out = await withExecStep({
                    userId,
                    executionId,
                    traceId,
                    step: "call:/api/email/flush",
                    meta: { limit },
                    fn: async () =>
                        internalPost("/api/email/flush", {
                            user_id: userId,
                            limit,
                        }, { traceId, executionId, executionRunId }),
                });

                await execLog({
                    userId,
                    executionId,
                    traceId,
                    message: "email.flush:done",
                    meta: {
                        limit,
                        // try a few common shapes
                        flushed: out?.flushed ?? out?.sent ?? out?.count ?? null,
                    },
                });

                await logFinish(ctx, "succeeded", { kind: job.kind });
                return { ok: true, output: { flushed: out?.flushed ?? out, limit } };
            }

            case "inbox.triage": {
                const limit = Number(job.payload?.limit ?? 10);
                const mode = String(job.payload?.mode ?? "inbox");

                if (dryRun) {
                    await execLog({ userId, executionId, traceId, level: "warn", message: "dry_run:skip inbox.triage", meta: { mode, limit } });
                    await logFinish(ctx, "succeeded", { kind: job.kind, dryRun, skipped: true });
                    return { ok: true, output: { dryRun: true, skipped: "inbox.triage", mode, limit } };
                }

                await execLog({
                    userId,
                    executionId,
                    traceId,
                    message: "inbox.triage:begin",
                    meta: { mode, limit },
                });

                const out = await withExecStep({
                    userId,
                    executionId,
                    traceId,
                    step: "call:/api/tasks/triage",
                    meta: { mode, limit },
                    fn: async () =>
                        internalPost("/api/tasks/triage", {
                            user_id: userId,
                            limit,
                            mode,
                        }, { traceId, executionId, executionRunId }),
                });

                await execLog({
                    userId,
                    executionId,
                    traceId,
                    message: "inbox.triage:done",
                    meta: {
                        mode,
                        limit,
                        tasks_created: out?.tasks_created ?? out?.created ?? null,
                        threads_scanned: out?.threads_scanned ?? out?.scanned ?? null,
                    },
                });

                await logFinish(ctx, "succeeded", { kind: job.kind });
                return { ok: true, output: { triaged: true, limit, mode, result: out } };
            }

            case "quest.refresh_today": {
                const questKeys: string[] = Array.isArray(job.payload?.questKeys)
                    ? job.payload.questKeys.map(String)
                    : ["daily_workout", "deep_work", "discipline_20"];

                const at = String(job.payload?.at ?? new Date().toISOString());
                const emitCompletionEvidence = !dryRun && Boolean(job.payload?.emitCompletionEvidence ?? true);

                await execLog({
                    userId,
                    executionId,
                    traceId,
                    message: "quest.refresh_today:begin",
                    meta: { questKeys, at, emitCompletionEvidence },
                });

                const results: any[] = [];

                for (const questKey of questKeys) {
                    await execLog({ userId, executionId, traceId, message: "quest:compute_checkpoint", meta: { questKey } });

                    // Quest checkpoints commented out as table is missing from schema
                    /*
                    const checkpointId = await withExecStep({
                        userId,
                        executionId,
                        traceId,
                        step: `checkpoint:${questKey}`,
                        meta: { questKey },
                        fn: async () =>
                            computeQuestCheckpoint({
                                userId,
                                questKey,
                                at,
                            } as any),
                    });

                    const { data: cp, error } = await supabaseAdmin
                        .from("quest_checkpoints")
                        .select("id,status,window_start,window_end,details,evaluator_key,evaluator_version")
                        .eq("id", checkpointId)
                        .eq("user_id", userId)
                        .single();

                    if (error || !cp) {
                        await execLog({
                            userId,
                            executionId,
                            traceId,
                            level: "error",
                            message: "quest:checkpoint_load_failed",
                            meta: { questKey, checkpointId, error: error?.message ?? "unknown" },
                        });
                        results.push({ questKey, checkpointId, ok: false, error: error?.message ?? "checkpoint load failed" });
                        continue;
                    }

                    await execLog({
                        userId,
                        executionId,
                        traceId,
                        message: "quest:checkpoint_status",
                        meta: { questKey, status: cp.status, window_start: cp.window_start, window_end: cp.window_end },
                    });

                    // Emit completion evidence once per window
                    if (emitCompletionEvidence && cp.status === "complete") {
                    */

                    // Temporary stub for quest processing until schema is restored
                    const cp = { status: "incomplete", window_start: at, window_end: at }; // Mock
                    if (emitCompletionEvidence) { // Mock condition
                        const completionKey = `quest:${questKey}:${at}`;

                        const { data: exists, error: exErr } = await supabaseAdmin
                            .from("life_evidence")
                            .select("id")
                            .eq("user_id_uuid", userId)
                            .eq("evidence_type", "quest.completed")
                            .contains("evidence_payload", { completion_key: completionKey })
                            .limit(1);

                        if (exErr) {
                            await execLog({
                                userId,
                                executionId,
                                traceId,
                                level: "warn",
                                message: "quest:completion_check_failed",
                                meta: { questKey, completionKey, error: exErr.message },
                            });
                        }

                        if (!exists || exists.length === 0) {
                            // Mocked insert logic disabled
                        } else {
                            await execLog({
                                userId,
                                executionId,
                                traceId,
                                message: "quest:completion_already_emitted",
                                meta: { questKey, completionKey },
                            });
                        }
                    }

                    results.push({ questKey, checkpoint: cp, ok: true, note: "Schema alignment pending" });
                }

                await execLog({
                    userId,
                    executionId,
                    traceId,
                    message: "quest.refresh_today:done",
                    meta: { refreshed: results.length, completed: results.filter((r) => r.ok && r.checkpoint?.status === "complete").length },
                });

                await logFinish(ctx, "succeeded", { kind: job.kind });
                return { ok: true, output: { refreshed: results.length, at, results } };
            }

            case "xp.replay.worker": {
                const maxJobs = Number(job.payload?.maxJobs ?? 50);

                if (dryRun) {
                    await execLog({ userId, executionId, traceId, level: "warn", message: "dry_run:skip xp.replay.worker" });
                    await logFinish(ctx, "succeeded", { kind: job.kind, dryRun, skipped: true });
                    return { ok: true, output: { dryRun: true, skipped: "xp.replay.worker" } };
                }

                await execLog({
                    userId,
                    executionId,
                    traceId,
                    message: "xp.replay.worker:begin",
                    meta: { maxJobs },
                });

                const out = await withExecStep({
                    userId,
                    executionId,
                    traceId,
                    step: "call:/api/xp/replay/run",
                    meta: { maxJobs },
                    fn: async () => internalPost("/api/xp/replay/run", { user_id: userId, max_jobs: maxJobs }, { traceId, executionId }),
                });

                await execLog({
                    userId,
                    executionId,
                    traceId,
                    message: "xp.replay.worker:done",
                    meta: { processed: out?.processed ?? null, failed: out?.failed ?? null },
                });

                await logFinish(ctx, "succeeded", { kind: job.kind });
                return { ok: true, output: out };
            }

            case "nudge.send": {
                await execLog({ userId, executionId, traceId, level: "warn", message: "nudge.send:not_implemented" });
                await logFinish(ctx, "succeeded", { kind: job.kind, note: "not implemented" });
                return { ok: true, output: { note: "nudge.send not wired yet" } };
            }

            default:
                await execLog({ userId, executionId, traceId, level: "error", message: "execution:unknown_kind", meta: { kind: job.kind } });
                await logFinish(ctx, "failed", { kind: job.kind });
                return { ok: false, error: `Unknown execution kind: ${String((job as any).kind)}` };
        }
    } catch (e: any) {
        const msg = e?.message ?? "execution failed";
        await execLog({ userId, executionId, traceId, level: "error", message: "execution:exception", meta: { error: msg } });
        await logFinish({ userId, executionId }, "failed", { error: msg });
        return { ok: false, error: msg };
    }
}
