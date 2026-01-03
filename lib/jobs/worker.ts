import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { jobClaimNext, jobComplete, jobHeartbeat } from "@/lib/jobs/db";
import { getJobHandler } from "@/lib/jobs/handlers";
import { jobLog } from "@/lib/jobs/logger";
import { computeBackoff } from "@/lib/jobs/backoff";
import { supabaseAdmin as createSupabaseAdmin } from "@/lib/supabase/admin";
import { runWithJobMetrics } from "@/lib/jobs/metrics/runWithJobMetrics";

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

function normalizeError(err: any) {
    return {
        name: err?.name ?? "Error",
        message: err?.message ?? String(err),
        stack: err?.stack ?? null,
        code: err?.code ?? null,
    };
}

function getWorkerId() {
    return process.env.JOB_WORKER_ID || `worker-${crypto.randomUUID().slice(0, 8)}`;
}

async function beat(supabaseAdmin: any, workerId: string) {
    await supabaseAdmin
        .from("job_worker_heartbeat")
        .upsert(
            {
                worker_id: workerId,
                last_seen_at: new Date().toISOString(),
                meta: {
                    pid: process.pid,
                    node: process.version,
                },
            },
            { onConflict: "worker_id" }
        );
}

// Helper functions for retry/failure (D2)
async function markJobRetry(supabase: any, jobId: string, opts: { attempts: number; error: string; runAt: Date }) {
    await supabase.from("job_queue").update({
        attempts: opts.attempts,
        status: "pending",
        next_run_at: opts.runAt.toISOString(),
        last_error: opts.error,
    }).eq("id", jobId);
}

async function markJobFailed(supabase: any, jobId: string, opts: { attempts: number; error: string }) {
    await supabase.from("job_queue").update({
        status: "failed", // mapped to 'dead' in previous logic, user spec says 'failed' with failed_at. I'll stick to 'dead' for terminal consistency or user spec 'failed'?
        // User spec says: status: "failed", failed_at: ... 
        // Previously we used "dead". I'll use "dead" to match "terminal failure" concept unless user explicitly wants "failed" status for terminal.
        // Actually, user spec D2 calls it `markJobFailed` but sets status `failed`. 
        // AND says "True DLQ behavior without a second table."
        // I will use `failed` as per spec D2 (it asked for it specifically).
        attempts: opts.attempts,
        last_error: opts.error,
        failed_at: new Date().toISOString(),
    }).eq("id", jobId);
}

export async function runWorker(opts?: { lanes?: any; maxEmptySleepsMs?: number }) {
    const workerId = getWorkerId();
    const lanes = opts?.lanes ?? ["realtime", "background", "nightly", "maintenance"];
    const emptySleep = opts?.maxEmptySleepsMs ?? 1000;

    // Bootstrap Heartbeat
    const sbAdmin = createSupabaseAdmin;
    setInterval(() => {
        beat(sbAdmin, workerId).catch(() => { });
    }, 15_000);

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const tickId = crypto.randomUUID();

        let job = null;
        try {
            job = await jobClaimNext(workerId, lanes);
        } catch (e) {
            await jobLog({ level: "error", message: "job_claim_next failed", meta: { tickId, err: normalizeError(e) } });
            await sleep(1000);
            continue;
        }

        if (!job) {
            await sleep(emptySleep);
            continue;
        }

        const ctx = {
            workerId,
            tickId,
            log: async (level: "debug" | "info" | "warn" | "error", message: string, meta?: any) => {
                await jobLog({
                    level,
                    message,
                    job_id: job!.id,
                    user_id_uuid: job!.user_id_uuid,
                    owner_user_id: job!.owner_user_id,
                    meta: { tickId, ...meta },
                });
            },
        };

        const hb = setInterval(() => {
            jobHeartbeat(job!.id, workerId).catch(() => { });
        }, 30_000);

        // Execution Logging: Start
        let runPk: string | null = null; // internal PK of execution_runs
        const executionId = crypto.randomUUID(); // logical trace ID
        const supabase = sbAdmin; // Reuse client
        let handlerResult: any = null; // Hoisted result

        try {
            const { data: runData, error: runErr } = await supabase
                .from("execution_runs")
                .insert({
                    execution_id: executionId,
                    status: "running",
                    started_at: new Date().toISOString(),
                    owner_user_id: job.owner_user_id ?? null,
                    user_id_uuid: job.user_id_uuid ?? null,
                })
                .select("id")
                .single();

            if (runErr) {
                await ctx.log("warn", "Failed to create execution_run", { err: runErr });
            } else if (runData) {
                runPk = runData.id;
            }
        } catch (e) {
            await ctx.log("warn", "Failed to insert execution_run (exception)", { err: normalizeError(e) });
        }

        try {
            await ctx.log("info", "Job start", { job_type: job.job_type, lane: job.lane, attempts: job.attempts });

            // Sentry Lifecycle Span (E1)
            await Sentry.startSpan({ op: "job.lifecycle", name: `job:${job.job_type}` }, async () => {
                // Use registry to get handler
                const handler = getJobHandler(job.job_type as any);

                // Tags (E2)
                Sentry.setTag("job_attempt", job.attempts ?? 0);
                if ((job.payload as any)?.day) Sentry.setTag("rollup_day", (job.payload as any).day);

                const result = await runWithJobMetrics(job.job_type, async () => {
                    return await handler({
                        job_id: job.id,
                        name: job.job_type as any,
                        payload: job.payload,
                        ctx: {
                            supabaseAdmin: supabase,
                            now: () => new Date(),
                            logger: {
                                info: (msg, ...args) => ctx.log("info", msg, args[0]),
                                warn: (msg, ...args) => ctx.log("warn", msg, args[0]),
                                error: (msg, ...args) => ctx.log("error", msg, args[0]),
                            },
                            user_id: job.user_id_uuid || job.owner_user_id || "unknown",
                        }
                    });
                });
                handlerResult = result;

                if (!handlerResult.ok) throw handlerResult.error;

                await jobComplete({
                    job_id: job.id,
                    worker_id: workerId,
                    status: "succeeded",
                    result: handlerResult.output,
                });
            }); // end span

            // Execution Logging: Success
            if (runPk) {
                await supabase
                    .from("execution_runs")
                    .update({
                        status: "succeeded",
                        finished_at: new Date().toISOString(),
                        output: {
                            job_type: job.job_type,
                            payload: job.payload,
                            result: handlerResult?.output ?? null,
                        }
                    })
                    .eq("id", runPk);
            }

            await ctx.log("info", "Job succeeded", { result_preview: handlerResult?.output ? JSON.stringify(handlerResult.output).slice(0, 500) : null });
        } catch (e: any) {
            const err = normalizeError(e);
            await ctx.log("error", "Job failed", { err });

            // Capture Exception (Obs)
            Sentry.captureException(e, {
                tags: { job_id: job.id, job_type: job.job_type },
                extra: { payload: job.payload }
            });

            // DLQ / Retry Logic (D2)
            const attempts = (job.attempts ?? 0) + 1;
            const MAX_ATTEMPTS = 3; // per spec D2

            if (attempts >= MAX_ATTEMPTS) {
                // Terminal
                await markJobFailed(supabase, job.id, {
                    attempts,
                    error: err.message,
                });
                await ctx.log("error", "Job terminal failure (DLQ)", { attempts });
            } else {
                // Retry
                await markJobRetry(supabase, job.id, {
                    attempts,
                    error: err.message,
                    runAt: new Date(Date.now() + attempts * 60_000), // linear backoff per spec D2
                });
                await ctx.log("warn", "Job rescheduled (linear)", { attempts });
            }

            // Execution Logging: Failure
            if (runPk) {
                await supabase
                    .from("execution_runs")
                    .update({
                        status: "failed",
                        finished_at: new Date().toISOString(),
                        error: JSON.stringify(err),
                    })
                    .eq("id", runPk);
            }
        } finally {
            clearInterval(hb);
        }
    }
}
