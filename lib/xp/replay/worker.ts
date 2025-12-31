import { supabaseAdmin } from "@/lib/supabase";
import { getEvaluator } from "@/lib/xp/evaluators/registry";

/**
 * Processes up to N queued replay jobs for a user.
 * For each job:
 *  - load evidence
 *  - evaluate with toVersion
 *  - create evaluation_run (idempotent)
 *  - issue ledger rows (idempotent)
 */
export async function runReplayWorker(params: { userId: string; maxJobs?: number }) {
    const { userId, maxJobs = 50 } = params;

    const { data: jobs, error } = await supabaseAdmin
        .from("xp_replay_jobs")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "queued")
        .order("created_at", { ascending: true })
        .limit(maxJobs);

    if (error) throw new Error(error.message);

    let processed = 0;
    let failed = 0;

    for (const job of jobs ?? []) {
        const jobId = job.id as string;

        try {
            await supabaseAdmin
                .from("xp_replay_jobs")
                .update({ status: "running", started_at: new Date().toISOString(), error: null })
                .eq("id", jobId)
                .eq("user_id", userId);

            const { data: evidence, error: e1 } = await supabaseAdmin
                .from("life_evidence")
                .select("*")
                .eq("id", job.evidence_id)
                .eq("user_id", userId)
                .single();
            if (e1 || !evidence) throw new Error(e1?.message ?? "evidence not found");

            const evaluator = getEvaluator(job.evaluator_key, job.to_version);
            if (!evaluator) throw new Error(`evaluator not found: ${job.evaluator_key} v${job.to_version}`);

            const result = evaluator.evaluate(evidence as any);

            // Create eval run (idempotent)
            const { data: evalRunId, error: e2 } = await supabaseAdmin.rpc("rpc_xp_create_eval_run", {
                p_evaluator_key: evaluator.key,
                p_evaluator_version: evaluator.version,
                p_evidence_id: evidence.id,
                p_result_xp: result.xp ?? {},
                p_result_meta: result.meta ?? {},
            });
            if (e2 || !evalRunId) throw new Error(e2?.message ?? "create eval run failed");

            // Issue ledger (idempotent)
            const { data: issuedCount, error: e3 } = await supabaseAdmin.rpc("rpc_xp_issue_from_eval_run", {
                p_eval_run_id: evalRunId,
            });
            if (e3) throw new Error(e3.message);

            await supabaseAdmin
                .from("xp_replay_jobs")
                .update({ status: "done", finished_at: new Date().toISOString() })
                .eq("id", jobId)
                .eq("user_id", userId);

            processed += 1;
        } catch (err: any) {
            failed += 1;
            await supabaseAdmin
                .from("xp_replay_jobs")
                .update({ status: "failed", error: err?.message ?? "failed", finished_at: new Date().toISOString() })
                .eq("id", jobId)
                .eq("user_id", userId);
        }
    }

    return { processed, failed };
}
