export type JobStatus =
    | "queued"
    | "claimed"
    | "running"
    | "succeeded"
    | "failed"
    | "dead_letter"
    | "canceled";

export type JobLane = "realtime" | "background" | "nightly" | "maintenance";

export type JobType =
    | "email_triage"
    | "quest_generate"
    | "followup_suggest"
    | "memory_compress"
    | "insight_refresh"
    | "noop"; // always keep a safe fallback

export type JobRow = {
    id: string;
    created_at: string;
    updated_at: string;

    user_id_uuid: string | null;
    owner_user_id: string | null;

    job_type: string;
    lane: string;
    priority: number;

    status: JobStatus;
    payload: Record<string, any>;

    dedupe_key: string | null;
    request_id: string | null;

    attempts: number;
    max_attempts: number;

    run_after: string | null;
    claimed_at: string | null;
    claimed_by: string | null;
    heartbeat_at: string | null;

    started_at: string | null;
    finished_at: string | null;

    last_error: any | null;
    last_result: any | null;
};

export type JobHandlerCtx = {
    workerId: string;
    tickId: string;
    log: (level: "debug" | "info" | "warn" | "error", message: string, meta?: any) => Promise<void>;
};

export type JobHandler = (job: JobRow, ctx: JobHandlerCtx) => Promise<any>;
