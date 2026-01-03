import { supabaseAdmin } from "@/lib/supabase/admin";

type Payload = {
    // optional tuning knobs
    days?: number;              // default 30
    batch_size?: number;        // default 300
    max_users?: number;         // default 2000
    attrib_top_n?: number;      // default 8
    payload_version?: number;   // default 1
};

import type { JobHandler } from "./types";

export const signalsCacheWarm30d: JobHandler<"signals_cache_warm_30d"> = async (job) => {
    const payload = job.payload ?? {};
    const days = clampInt(payload.days ?? 30, 1, 120);
    const batchSize = clampInt(payload.batch_size ?? 300, 50, 2000);
    const maxUsers = clampInt(payload.max_users ?? 2000, 50, 20000);
    const attribTopN = clampInt(payload.attrib_top_n ?? 8, 1, 25);
    const payloadVersion = clampInt(payload.payload_version ?? 1, 1, 100);

    const endDay = isoDate(new Date());
    const startDay = isoDate(addDays(new Date(), -(days - 1)));

    let offset = 0;
    let warmedUsers = 0;
    let totalRebuiltDays = 0;

    while (warmedUsers < maxUsers) {
        const { data: users, error } = await supabaseAdmin.rpc("signals_cache_warm_candidates", {
            p_days: days,
            p_limit: batchSize,
            p_offset: offset,
        });

        if (error) throw error;
        if (!users || users.length === 0) break;

        for (const row of users) {
            if (warmedUsers >= maxUsers) break;

            const ownerUserId = row.owner_user_id as string;
            if (!ownerUserId) continue;

            const { data: rebuilt, error: warmErr } = await supabaseAdmin.rpc(
                "user_daily_signals_cache_warm_range",
                {
                    p_owner_user_id: ownerUserId,
                    p_start_day: startDay,
                    p_end_day: endDay,
                    p_days_for_payload: days,
                    p_attrib_top_n: attribTopN,
                    p_payload_version: payloadVersion,
                }
            );

            if (warmErr) throw warmErr;

            totalRebuiltDays += Number(rebuilt ?? 0);
            warmedUsers += 1;
        }

        offset += users.length;

        // if last page smaller than batchSize, we're done
        if (users.length < batchSize) break;
    }

    return {
        ok: true,
        data: {
            days,
            startDay,
            endDay,
            warmedUsers,
            totalRebuiltDays,
        }
    };
}

function clampInt(n: number, min: number, max: number) {
    const x = Number.isFinite(n) ? Math.floor(n) : min;
    return Math.max(min, Math.min(max, x));
}

function isoDate(d: Date) {
    return d.toISOString().slice(0, 10);
}

function addDays(d: Date, delta: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + delta);
    return x;
}
