import { z } from "zod";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import type { JobHandler } from "./types";

export const DailyActivityRollupRefreshPayload = z.object({
    user_id_uuid: z.string().uuid().nullable().optional(), // null = all users
    days: z.number().int().min(1).max(365).optional(),
});

export type DailyActivityRollupRefreshPayload = z.infer<
    typeof DailyActivityRollupRefreshPayload
>;

export const dailyActivityRollupRefreshHandler: JobHandler<"daily_activity_rollup_refresh"> = async ({ payload }) => {
    // Validate again if needed, or rely on type safety. Zod is good for runtime.
    const parsed = DailyActivityRollupRefreshPayload.parse(payload);
    const supabase = getSupabaseAdminRuntimeClient();

    const userId = parsed.user_id_uuid ?? null;
    const days = parsed.days ?? 30;

    const { error } = await supabase.rpc("user_daily_activity_rollup_refresh", {
        p_user_id: userId,
        p_days: days,
    });

    if (error) {
        throw new Error(
            `user_daily_activity_rollup_refresh failed: ${error.message}`
        );
    }

    return { ok: true, output: { user_id_uuid: userId, days } };
}
