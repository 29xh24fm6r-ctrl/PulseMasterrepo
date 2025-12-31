import { NextResponse } from "next/server";
import crypto from "crypto";
import { jobClaimNext, jobComplete } from "@/lib/jobs/db";
import { handlers } from "@/lib/jobs/handlers";
import { jobLog } from "@/lib/jobs/logger";

function normalizeError(err: any) {
    return {
        name: err?.name ?? "Error",
        message: err?.message ?? String(err),
        stack: err?.stack ?? null,
        code: err?.code ?? null,
    };
}

export async function POST(req: Request) {
    const opsKey = req.headers.get("x-pulse-ops-key");
    if (!opsKey || opsKey !== process.env.PULSE_OPS_KEY) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const workerId = process.env.JOB_WORKER_ID || "cron-tick";
    const tickId = crypto.randomUUID();

    const url = new URL(req.url);
    const max = Math.min(parseInt(url.searchParams.get("max") ?? "10", 10), 50);

    let processed = 0;
    const results: any[] = [];

    for (let i = 0; i < max; i++) {
        const job = await jobClaimNext(workerId);
        if (!job) break;

        const log = async (level: any, message: string, meta?: any) => {
            await jobLog({
                level,
                message,
                job_id: job.id,
                user_id_uuid: job.user_id_uuid,
                owner_user_id: job.owner_user_id,
                meta: { tickId, ...meta },
            });
        };

        try {
            await log("info", "Tick job start", { job_type: job.job_type, lane: job.lane, attempts: job.attempts });

            const handler = handlers[job.job_type] ?? handlers.noop;
            const result = await handler(job.payload, {
                supabaseAdmin: (await import("@/lib/supabase/admin")).supabaseAdmin(),
                now: () => new Date(),
                logger: {
                    info: (msg, meta) => log("info", msg, meta),
                    warn: (msg, meta) => log("warn", msg, meta),
                    error: (msg, meta) => log("error", msg, meta)
                }
            });

            await jobComplete({ job_id: job.id, worker_id: workerId, status: "succeeded", result });
            results.push({ id: job.id, status: "succeeded" });
            processed++;
        } catch (e) {
            const err = normalizeError(e);
            await log("error", "Tick job failed", { err });

            await jobComplete({ job_id: job.id, worker_id: workerId, status: "failed", error: err });
            results.push({ id: job.id, status: "failed" });
            processed++;
        }
    }

    return NextResponse.json({ ok: true, processed, results });
}
