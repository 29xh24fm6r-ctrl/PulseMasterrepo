import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export async function createCookPlan(args: {
    owner_user_id: string;
    recipe_id?: string | null;
    title: string;

    target_eat_at: string; // ISO
    start_cook_at: string; // ISO

    prep_minutes: number;
    cook_minutes: number;
    buffer_minutes: number;
    user_speed_modifier: number;

    meta?: any;
}) {
    const sb = getSupabaseAdminRuntimeClient();

    const { data, error } = await sb
        .from("chef_cook_plans")
        .insert({
            owner_user_id: args.owner_user_id,
            recipe_id: args.recipe_id ?? null,
            title: args.title,
            target_eat_at: args.target_eat_at,
            start_cook_at: args.start_cook_at,
            prep_minutes: args.prep_minutes,
            cook_minutes: args.cook_minutes,
            buffer_minutes: args.buffer_minutes,
            user_speed_modifier: args.user_speed_modifier,
            status: "scheduled",
            last_recomputed_at: new Date().toISOString(),
            meta: args.meta ?? {},
        })
        .select("*")
        .single();

    if (error) throw error;
    return data;
}
