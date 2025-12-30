import crypto from "crypto";
import { jobClaimNext, jobComplete, jobHeartbeat } from "@/lib/jobs/db";
import { handlers } from "@/lib/jobs/handlers";
import { jobLog } from "@/lib/jobs/logger";

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

export async function runWorker(opts?: { lanes?: any; maxEmptySleepsMs?: number }) {
    const workerId = process.env.JOB_WORKER_ID || `worker-${crypto.randomUUID().slice(0, 8)}`;
    const lanes = opts?.lanes ?? ["realtime", "background", "nightly", "maintenance"];
    const emptySleep = opts?.maxEmptySleepsMs ?? 1000;

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
        const supabase = (await import("@/lib/supabase/admin")).supabaseAdmin();

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

            const handler = handlers[job.job_type] ?? handlers.noop;
            // Adapt DB JobRow to payload + ctx
            const result = await handler(job.payload, {
                supabaseAdmin: supabase,
                now: () => new Date(),
                logger: ctx
            });

            await jobComplete({
                job_id: job.id,
                worker_id: workerId,
                status: "succeeded",
                result,
            });

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
                            result: result ?? null,
                        }
                    })
                    .eq("id", runPk);
            }

            await ctx.log("info", "Job succeeded", { result_preview: result ? JSON.stringify(result).slice(0, 500) : null });
        } catch (e) {
            const err = normalizeError(e);
            await ctx.log("error", "Job failed", { err });

            await jobComplete({
                job_id: job.id,
                worker_id: workerId,
                status: "failed",
                error: err,
            });

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
