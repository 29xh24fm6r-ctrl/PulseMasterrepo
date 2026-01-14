import { supabaseAdmin } from "@/lib/supabase/admin";

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

export async function recordCookingLearning(args: {
    owner_user_id: string;
    cook_plan_id: string;
    execution_id: string;
    started_at: string;
    finished_at: string;
}) {
    const sb = supabaseAdmin();

    const { data: plan, error: pErr } = await sb
        .from("chef_cook_plans")
        .select("id, owner_user_id, prep_minutes, cook_minutes, buffer_minutes, user_speed_modifier")
        .eq("id", args.cook_plan_id)
        .eq("owner_user_id", args.owner_user_id)
        .single();

    if (pErr) throw pErr;

    const plannedTotal = Math.round(((Number(plan.prep_minutes) + Number(plan.cook_minutes)) * Number(plan.user_speed_modifier)) + Number(plan.buffer_minutes));

    const actualMs = new Date(args.finished_at).getTime() - new Date(args.started_at).getTime();
    const actualTotal = Math.max(1, Math.round(actualMs / 60000));

    // Suggested modifier: scale planned base time (prep+cook) to actual (minus buffer)
    const basePlanned = Math.max(1, Number(plan.prep_minutes) + Number(plan.cook_minutes));
    const baseActual = Math.max(1, actualTotal - Number(plan.buffer_minutes));

    const rawSuggested = baseActual / basePlanned;

    // Smooth update (EMA-ish): 80% old, 20% new
    const oldMod = Number(plan.user_speed_modifier);
    const suggested = clamp(rawSuggested, 0.5, 2.0);
    const newMod = clamp(oldMod * 0.8 + suggested * 0.2, 0.5, 2.0);

    const { error: insErr } = await sb.from("chef_cook_learning_events").insert({
        owner_user_id: args.owner_user_id,
        cook_plan_id: args.cook_plan_id,
        execution_id: args.execution_id,
        planned_total_minutes: plannedTotal,
        actual_total_minutes: actualTotal,
        planned_speed_modifier: oldMod,
        suggested_speed_modifier: newMod,
    });
    if (insErr) throw insErr;

    // Update plan with new modifier (for future reschedules / next plans)
    const { error: upErr } = await sb
        .from("chef_cook_plans")
        .update({ user_speed_modifier: newMod })
        .eq("id", args.cook_plan_id)
        .eq("owner_user_id", args.owner_user_id);

    if (upErr) throw upErr;

    return { plannedTotal, actualTotal, oldMod, newMod };
}
