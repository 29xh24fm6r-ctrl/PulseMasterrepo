import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

/**
 * Enqueue replay jobs for a user across evidence in a time range.
 * It does NOT run evaluation. It only queues.
 */
export async function enqueueReplayJobs(params: {
    userId: string;
    evaluatorKey: string;
    fromVersion: number;
    toVersion: number;
    evidenceType?: string;
    since?: string; // ISO
    until?: string; // ISO
    limit?: number;
}) {
    const { userId, evaluatorKey, fromVersion, toVersion, evidenceType, since, until, limit = 500 } = params;

    let q = getSupabaseAdminRuntimeClient()
        .from("life_evidence")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(limit);

    if (evidenceType) q = q.eq("evidence_type", evidenceType);
    if (since) q = q.gte("created_at", since);
    if (until) q = q.lt("created_at", until);

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    const rows = (data ?? []).map((r: any) => ({
        user_id: userId,
        evidence_id: r.id,
        evaluator_key: evaluatorKey,
        from_version: fromVersion,
        to_version: toVersion,
        status: "queued",
    }));

    if (rows.length === 0) return { queued: 0 };

    const { error: e2 } = await getSupabaseAdminRuntimeClient().from("xp_replay_jobs").insert(rows);
    // on conflict handled by unique constraint; if you want upsert, add it later
    if (e2) throw new Error(e2.message);

    return { queued: rows.length };
}
