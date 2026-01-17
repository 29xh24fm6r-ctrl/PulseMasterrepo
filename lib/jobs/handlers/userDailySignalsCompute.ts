import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import type { JobHandler } from "./types";

function isoDate(d: Date) {
    return d.toISOString().slice(0, 10);
}

export const userDailySignalsCompute: JobHandler<"user_daily_signals_compute"> = async (job) => {
    const ownerUserId = job.payload.owner_user_id;
    const day = job.payload.day ?? isoDate(new Date());
    const supabase = job.ctx?.getSupabaseAdminRuntimeClient() ?? getSupabaseAdminRuntimeClient();

    let xp: any = null;
    let momentum: any = null;
    let lifeScore: any = null;

    // 1) XP
    {
        const { data, error } = await supabase.rpc("compute_daily_xp", {
            p_owner_user_id: ownerUserId,
            p_day: day,
        });
        if (error) throw error;
        xp = data;
    }

    // 2) Momentum
    {
        const { data, error } = await supabase.rpc("compute_daily_momentum", {
            p_owner_user_id: ownerUserId,
            p_day: day,
        });
        if (error) throw error;
        momentum = data;
    }

    // 3) Life Score
    {
        const { data, error } = await supabase.rpc("compute_daily_life_score", {
            p_owner_user_id: ownerUserId,
            p_day: day,
        });
        if (error) throw error;
        lifeScore = data;
    }

    // 4) Nudges
    {
        const { error } = await supabase.rpc("generate_daily_nudges", {
            p_owner_user_id: ownerUserId,
            p_day: day,
        });
        if (error) throw error;
    }

    // 5) Predictive streak loss alerts
    // Pull active alert rules and compute risk for each rollup_key
    const { data: rules, error: rulesErr } = await supabase
        .from("streak_alert_rules")
        .select("rollup_key,risk_threshold,notify_cooldown_hours")
        .eq("is_active", true);

    if (rulesErr) throw rulesErr;

    for (const r of rules ?? []) {
        const { data: riskRows, error: riskErr } = await supabase.rpc("compute_streak_risk", {
            p_owner_user_id: ownerUserId,
            p_rollup_key: r.rollup_key,
            p_day: day,
        });
        if (riskErr) throw riskErr;

        const row = Array.isArray(riskRows) ? riskRows[0] : null;
        const risk = Number(row?.risk ?? 0);
        const reason = String(row?.reason ?? "");

        if (risk < Number(r.risk_threshold)) continue;

        // cooldown: avoid alert spam
        const cooldownHours = Number(r.notify_cooldown_hours ?? 24);
        const since = new Date();
        since.setHours(since.getHours() - cooldownHours);

        const { data: recentAlerts, error: recentErr } = await supabase
            .from("streak_alerts")
            .select("id,created_at")
            .eq("owner_user_id", ownerUserId)
            .eq("rollup_key", r.rollup_key)
            .gte("created_at", since.toISOString())
            .limit(1);

        if (recentErr) throw recentErr;
        if ((recentAlerts?.length ?? 0) > 0) continue;

        const { error: insErr } = await supabase.from("streak_alerts").insert({
            owner_user_id: ownerUserId,
            rollup_key: r.rollup_key,
            day,
            risk,
            reason,
        });
        if (insErr) throw insErr;
    }

    return { ok: true, output: { day, signals_computed: true } };
}
