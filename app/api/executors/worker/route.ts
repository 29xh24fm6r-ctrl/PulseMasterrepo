import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { runPlaywrightJob } from "@/services/executors/playwright";
import { calculateNextRetry, isRetryableError } from "@/services/executors/retry";
import { logStep } from "@/services/executors/ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const secret = req.headers.get("x-exec-secret");
    if (secret !== process.env.EXEC_WORKER_SECRET) {
        return new Response("Unauthorized", { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Claim a job
    // Atomic update/select via Postgres func would be better, doing simple lock here
    const { data: jobs } = await supabase
        .from("exec_outbox")
        .select("*")
        .eq("status", "ready")
        .lt("next_retry_at", new Date().toISOString()) // Handle retries
        .limit(1);

    if (!jobs || jobs.length === 0) return Response.json({ claimed: 0 });

    const job = jobs[0];

    // Lock it
    await supabase.from("exec_outbox").update({ status: "running", locked_at: new Date().toISOString() }).eq("id", job.id);
    await supabase.from("exec_runs").update({ status: "running" }).eq("id", job.run_id);

    try {
        let result = { ok: false, output: null, error: null, retryable: false };

        // Dispatch
        if (job.job_kind.includes("playwright")) {
            result = await runPlaywrightJob({ run_id: job.run_id, payload: job.payload_json });
        } else {
            // Fallback/No-op
            result = { ok: true, output: "noop" };
        }

        if (result.ok) {
            // Success
            await supabase.from("exec_runs").update({
                status: "succeeded",
                result_json: result.output
            }).eq("id", job.run_id);

            await supabase.from("exec_outbox").update({ status: "done" }).eq("id", job.id);
            await logStep(job.run_id, "job_succeeded", result.output);
        } else {
            throw result.error; // Trigger catch block for retry logic
        }

    } catch (err: any) {
        const retryable = isRetryableError(err);
        const nextAttempt = job.attempt + 1;

        await logStep(job.run_id, "job_failed", { error: err.message });

        if (retryable && nextAttempt <= job.max_attempts) {
            const nextTry = calculateNextRetry(nextAttempt);
            await supabase.from("exec_outbox").update({
                status: "retrying",
                attempt: nextAttempt,
                next_retry_at: nextTry.toISOString(),
                last_error_json: { message: err.message }
            }).eq("id", job.id);

            await supabase.from("exec_runs").update({ status: "retrying" }).eq("id", job.run_id);
        } else {
            await supabase.from("exec_outbox").update({
                status: "dead",
                last_error_json: { message: err.message }
            }).eq("id", job.id);

            await supabase.from("exec_runs").update({
                status: "failed",
                error_json: { message: err.message }
            }).eq("id", job.run_id);
        }
    }

    return Response.json({ claimed: 1, job_id: job.id });
}
