import { supabaseAdmin } from "@/lib/supabase";
import type { Evidence } from "@/lib/xp/evaluators/types";
import { getActiveDefaultEvaluator } from "@/lib/xp/evaluators/registry";

type RpcRes<T> = { data: T | null; error: any };

export async function evaluateEvidenceAndIssue(userId: string, evidence: Evidence) {
    const evaluator = getActiveDefaultEvaluator();
    const result = evaluator.evaluate(evidence);

    // 1) create eval run (idempotent)
    const { data: evalRunId, error: e1 }: RpcRes<string> = await supabaseAdmin.rpc(
        "rpc_xp_create_eval_run",
        {
            p_evaluator_key: evaluator.key,
            p_evaluator_version: evaluator.version,
            p_evidence_id: evidence.id,
            p_result_xp: result.xp ?? {},
            p_result_meta: result.meta ?? {},
        }
    );

    // supabaseAdmin.rpc doesn't actually accept headers in the standard client;
    // this is a placeholder in case you have a custom wrapper.
    // If you don't, call via user session (client) or create a SECURITY DEFINER RPC later.
    if (e1 || !evalRunId) throw new Error(`xp_create_eval_run failed: ${e1?.message ?? e1}`);

    // 2) issue ledger from eval run (idempotent)
    const { data: issuedCount, error: e2 }: RpcRes<number> = await supabaseAdmin.rpc(
        "rpc_xp_issue_from_eval_run",
        { p_eval_run_id: evalRunId }
    );
    if (e2) throw new Error(`xp_issue_from_eval_run failed: ${e2?.message ?? e2}`);

    return { eval_run_id: evalRunId, issued_count: issuedCount ?? 0, result };
}
