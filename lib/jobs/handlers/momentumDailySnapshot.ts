import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { JobHandler } from "./types";

export const momentumDailySnapshot: JobHandler<"momentum_daily_snapshot"> = async ({ job_id, payload, ctx }) => {
    const { owner_user_id } = payload;

    if (!owner_user_id) {
        throw new Error("momentumDailySnapshot: missing owner_user_id");
    }

    const sb = ctx.getSupabaseAdminRuntimeClient() || getSupabaseAdminRuntimeClient();

    const { error } = await sb.rpc("momentum_snapshot_refresh", {
        p_owner_user_id: owner_user_id,
    });

    if (error) {
        throw new Error(`RPC momentum_snapshot_refresh failed: ${error.message}`);
    }

    return { ok: true, output: { success: true } };
};
