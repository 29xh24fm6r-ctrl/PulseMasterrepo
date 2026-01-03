import { jobEnqueue } from "@/lib/jobs/db";
import type { JobLane } from "@/lib/jobs/types";

export async function enqueueDailyActivityRollupRefresh(args: {
    user_id_uuid?: string | null;
    days?: number;
    priority?: number;
}) {
    return jobEnqueue({
        job_type: "daily_activity_rollup_refresh",
        lane: "background", // or 'nightly' if preferred
        owner_user_id: args.user_id_uuid ?? null, // if null (all users), owner is null? or system?
        user_id_uuid: args.user_id_uuid ?? null,
        priority: args.priority ?? 50,
        payload: {
            user_id_uuid: args.user_id_uuid ?? null,
            days: args.days ?? 30,
        },
        // Dedup so we don't stack refresh jobs
        dedupe_key: `daily_activity_rollup_refresh:${args.user_id_uuid ?? "all"}:${args.days ?? 30
            }`,
    });
}
