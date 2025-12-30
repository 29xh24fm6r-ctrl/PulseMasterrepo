import { supabaseAdmin } from "@/lib/supabase";

export async function linkArtifact(params: {
    userId: string;
    traceId?: string | null;
    executionId?: string | null;
    executionRunId?: string | null;

    fromType: string;
    fromId?: string | null;
    fromKey?: string | null;

    relation: string;
    meta?: Record<string, any>;

    toType: string;
    toId?: string | null;
    toKey?: string | null;
}) {
    const {
        userId,
        traceId = null,
        executionId = null,
        executionRunId = null,
        fromType,
        fromId = null,
        fromKey = null,
        relation,
        meta = {},
        toType,
        toId = null,
        toKey = null,
    } = params;

    try {
        await supabaseAdmin.rpc("rpc_artifact_link_insert", {
            p_user_id: userId,
            p_trace_id: traceId,
            p_execution_id: executionId,
            p_execution_run_id: executionRunId,
            p_from_type: fromType,
            p_from_id: fromId,
            p_from_key: fromKey,
            p_relation: relation,
            p_meta: meta,
            p_to_type: toType,
            p_to_id: toId,
            p_to_key: toKey,
        });
    } catch {
        // Best-effort: never throw
    }
}
