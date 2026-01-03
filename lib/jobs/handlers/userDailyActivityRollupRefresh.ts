import * as Sentry from "@sentry/nextjs";
import { createClient } from "@supabase/supabase-js";
import { jobEnqueue } from "@/lib/jobs/db";
import type { JobHandler } from "./types";

type RollupPayload = {
    user_id_uuid: string; // stored as text in payload JSON
    day: string;          // YYYY-MM-DD
    source?: string;
};

function getServiceSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL; // Adjusted env var name for consistency (or should I use SUPABASE_URL?)
    // The user prompt used SUPABASE_URL. I'll stick to what I know works or what the prompt said?
    // Previous `admin.ts` used NEXT_PUBLIC_SUPABASE_URL.
    // The prompt explicitly said: `const url = process.env.SUPABASE_URL;`
    // I will use `process.env.NEXT_PUBLIC_SUPABASE_URL` if `SUPABASE_URL` is missing, to be safe.
    const envUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!envUrl || !key) {
        throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for worker");
    }

    return createClient(envUrl, key, {
        auth: { persistSession: false },
    });
}

export const handleUserDailyActivityRollupRefresh: JobHandler<"user_daily_activity_rollup_refresh"> = async ({ job_id, payload, ctx }) => {
    const ownerUserId = ctx.user_id; // Mapping args correctly

    if (!payload?.user_id_uuid || !payload?.day) {
        throw new Error(
            `Invalid payload for user_daily_activity_rollup_refresh (jobId=${job_id})`
        );
    }

    // Observability context
    Sentry.setTag("job_type", "user_daily_activity_rollup_refresh");
    Sentry.setTag("job_id", job_id);
    Sentry.setTag("owner_user_id", ownerUserId);
    Sentry.setContext("job_payload", payload);

    const supabase = getServiceSupabase();

    const userIdUuid = payload.user_id_uuid;
    const day = payload.day;

    const spanName = `job:user_daily_activity_rollup_refresh:${userIdUuid}:${day}`;

    return await Sentry.startSpan(
        { op: "job.execute", name: spanName },
        async () => {
            // import moved to top

            // ...

            // Call refresh RPC
            const { error } = await supabase.rpc("user_daily_activity_rollup_refresh", {
                p_user_id_uuid: userIdUuid,
                p_day: day,
            });

            if (error) {
                // Capture and throw so your worker marks job failed
                Sentry.captureException(error, {
                    tags: { job_id: job_id },
                });
                throw new Error(`Rollup refresh RPC failed: ${error.message}`);
            }

            // 3A) Invalidate signals cache (so next compute rebuilds it)
            await supabase.rpc("user_daily_signals_cache_invalidate", {
                p_owner_user_id: ownerUserId,
                p_day: day, // Refreshing rollups for this day affects this day's signals
            });

            // 4) Chain signals compute
            // We already have a valid job structure, so let's queue the next step
            // to ensure signals (XP, Score) are fresh immediately after rollups.
            const { error: enqueueErr } = await supabase.rpc("enqueue_job", {
                p_job_type: "user_daily_signals_compute",
                p_payload: {
                    owner_user_id: ownerUserId,
                    day: day, // same day
                    force: true,
                },
            }).catch(e => {
                // Non-blocking failure for chaining, but log it
                Sentry.captureException(e, { tags: { source: "chain_signals" } });
                console.error("Failed to chain signal compute", e);
            });

            // Optional breadcrumb for successful completion
            Sentry.addBreadcrumb({
                category: "job",
                message: "Daily activity rollup refreshed",
                level: "info",
                data: { job_id, userIdUuid, day, source: payload.source },
            });

            return { ok: true };
        }
    );
}
