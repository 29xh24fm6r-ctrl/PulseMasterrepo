import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export async function readNextCookPlan(args: { owner_user_id: string }) {
    const sb = getSupabaseAdminRuntimeClient();

    // Next plan that is scheduled and not in the past too far.
    const { data, error } = await sb
        .from("chef_cook_plans")
        .select("id, owner_user_id, recipe_id, title, target_eat_at, start_cook_at, prep_minutes, cook_minutes, buffer_minutes, user_speed_modifier, status, meta, created_at, updated_at")
        .eq("owner_user_id", args.owner_user_id)
        .in("status", ["scheduled", "rescheduled"])
        .order("start_cook_at", { ascending: true })
        .limit(5);

    if (error) throw error;

    const plans = data ?? [];
    if (!plans.length) return null;

    // Pick first one that hasn't been long missed (grace window 6 hours)
    const graceMs = 6 * 60 * 60 * 1000;
    const now = Date.now();

    for (const p of plans) {
        const start = new Date(p.start_cook_at).getTime();
        if (Number.isNaN(start)) continue;
        if (start + graceMs >= now) return p;
    }

    // If all are too old, return the soonest anyway (UI can show "missed" state)
    return plans[0];
}
