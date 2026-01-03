import { supabaseAdmin } from "@/lib/supabase/admin";
import type { JobHandler } from "./types";

function toISODate(d: Date) {
    return d.toISOString().slice(0, 10);
}

export const rollupBackfillNightly: JobHandler<"rollup_backfill_nightly"> = async () => {
    // Note: This handler likely needs to be an 'any' generic or mapped correctly if strictly typed. 
    // The registry expects JobHandler<any> compatibility.
    const supabase = supabaseAdmin;
    const { data: rollups, error } = await supabase
        .from("rollup_definitions")
        .select("rollup_key")
        .eq("is_active", true);

    if (error) throw error;

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 90); // cost-capped window

    for (const r of rollups ?? []) {
        const { error: rpcErr } = await supabase.rpc("compute_rollup", {
            p_rollup_key: r.rollup_key,
            p_start_date: toISODate(start),
            p_end_date: toISODate(end),
        });
        if (rpcErr) throw rpcErr;
    }
    return { ok: true, output: { processed: rollups?.length ?? 0 } };
}
