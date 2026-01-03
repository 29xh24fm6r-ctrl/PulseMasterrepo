export type JobName =
    | "email_triage"
    | "followup_suggest"
    | "quest_generate"
    | "open_thread_sweep"
    | "daily_activity_rollup_refresh"
    | "user_daily_activity_rollup_refresh"
    | "rollup_backfill_nightly"
    | "signals_cache_prune_weekly"
    | "signals_cache_warm_30d"
    | "user_daily_signals_compute"; // Preserving this existing job type

export type JobPayloads = {
    email_triage: {
        user_id_uuid: string; // aligned with existing code
        user_id?: string;     // backward compat
        account_id?: string;
        thread_id?: string;
        message_id?: string;
        text?: string;        // for simple text triage
        limit?: number;
        force?: boolean;
    };

    followup_suggest: {
        user_id_uuid: string;
        user_id?: string;
        contact_id?: string;
        deal_id?: string;
        context?: Record<string, unknown>;
        // Existing fields support
        limit?: number;
        mode?: "draft" | "queued";
        since_days?: number;
        use_ai?: boolean;
    };

    quest_generate: {
        user_id_uuid: string;
        user_id?: string;
        horizon?: "today" | "week";
        focus?: string;
        // Existing fields
        day?: string;
        count?: number;
    };

    open_thread_sweep: {
        user_id_uuid: string;
        max_threads?: number;
        wait_days?: number;
        nudge_cooldown_days?: number;
        mode?: "draft" | "queued";
    };

    daily_activity_rollup_refresh: {
        user_id_uuid?: string | null;
        days?: number;
    };

    user_daily_activity_rollup_refresh: {
        user_id_uuid: string; // stored as text in payload JSON
        day: string;          // YYYY-MM-DD
        source?: string;
    };

    rollup_backfill_nightly: Record<string, never>; // No payload

    signals_cache_warm_30d: {
        days?: number;
        batch_size?: number;
        max_users?: number;
        attrib_top_n?: number;
        payload_version?: number;
    };

    user_daily_signals_compute: {
        owner_user_id: string;
        day?: string; // YYYY-MM-DD
    };
};

export type JobPayload<N extends JobName> = JobPayloads[N];

export type JobHandlerResult = {
    ok: true;
    output?: Record<string, unknown>;
    // Support existing return shapes flexibility
    [key: string]: any;
} | {
    ok: false;
    error: { code: string; message: string; details?: unknown };
};

export type JobHandler<N extends JobName = JobName> = (args: {
    job_id: string;
    name: N;
    payload: JobPayload<N>;
    // caller-provided context (db clients, logger, etc.)
    ctx: {
        supabaseAdmin: any; // SupabaseClient
        now: () => Date;
        logger: { info: (msg: string, ...args: any[]) => void; warn: (msg: string, ...args: any[]) => void; error: (msg: string, ...args: any[]) => void };
        user_id: string;
    };
}) => Promise<JobHandlerResult>;
