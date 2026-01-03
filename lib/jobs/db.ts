import { supabaseAdmin } from "@/lib/supabase/admin";
import type { JobRow, JobLane } from "@/lib/jobs/types";

export async function jobEnqueue(args: {
    user_id_uuid: string | null;
    owner_user_id: string | null;
    job_type: string;
    lane: JobLane;
    priority?: number;
    payload?: any;
    dedupe_key?: string | null;
    request_id?: string | null;
    run_after?: string | null;
    max_attempts?: number;
}) {
    const sb = supabaseAdmin;
    const { data, error } = await sb.rpc("job_enqueue", {
        p_user_id_uuid: args.user_id_uuid,
        p_owner_user_id: args.owner_user_id,
        p_job_type: args.job_type,
        p_lane: args.lane,
        p_priority: args.priority ?? 0,
        p_payload: args.payload ?? {},
        p_dedupe_key: args.dedupe_key ?? null,
        p_request_id: args.request_id ?? null,
        p_run_after: args.run_after ?? null,
        p_max_attempts: args.max_attempts ?? 5,
    });

    if (error) throw error;
    return data as JobRow;
}

export async function jobClaimNext(workerId: string, lanes?: JobLane[]) {
    const sb = supabaseAdmin;
    const { data, error } = await sb.rpc("job_claim_next", {
        p_worker_id: workerId,
        p_lanes: lanes ?? ["realtime", "background", "nightly", "maintenance"],
        p_heartbeat_timeout_seconds: 90,
    });
    if (error) throw error;
    return (data ?? null) as JobRow | null;
}

export async function jobHeartbeat(jobId: string, workerId: string) {
    const sb = supabaseAdmin;
    const { error } = await sb.rpc("job_heartbeat", {
        p_job_id: jobId,
        p_worker_id: workerId,
    });
    if (error) throw error;
}

export async function jobComplete(args: {
    job_id: string;
    worker_id: string;
    status: "succeeded" | "failed" | "canceled";
    result?: any;
    error?: any;
}) {
    const sb = supabaseAdmin;
    const { data, error } = await sb.rpc("job_complete", {
        p_job_id: args.job_id,
        p_worker_id: args.worker_id,
        p_status: args.status,
        p_result: args.result ?? null,
        p_error: args.error ?? null,
    });
    if (error) throw error;
    return data as JobRow;
}
