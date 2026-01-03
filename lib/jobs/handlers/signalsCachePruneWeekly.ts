import { JobHandler } from "./types";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const signalsCachePruneWeekly: JobHandler<"signals_cache_prune_weekly"> = async (job) => {
    const payload = job.payload as any;
    const supabase = supabaseAdmin;
    const retentionDays = payload.retention_days ?? 365;

    // Prune entries older than retention period
    const { error } = await supabase
        .from("user_daily_signals_cache")
        .delete()
        .lt("day", new Date(Date.now() - retentionDays * 86400000).toISOString().slice(0, 10));

    if (error) {
        throw new Error(`Failed to prune signals cache: ${error.message}`);
    }

    return {
        ok: true,
        data: {
            retention_days: retentionDays,
            pruned: true, // We don't get row count from delete easily in supabase js unless select() is used
        },
    };
};
