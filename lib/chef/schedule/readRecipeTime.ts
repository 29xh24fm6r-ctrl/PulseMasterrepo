import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export async function readRecipeTimeDefaults(recipe_id: string) {
    const sb = getSupabaseAdminRuntimeClient();
    const { data, error } = await sb
        .from("chef_recipes")
        .select("id,title,prep_minutes,cook_minutes")
        .eq("id", recipe_id)
        .single();

    if (error) throw error;

    return {
        title: data.title as string,
        prep_minutes: Number(data.prep_minutes ?? 0),
        cook_minutes: Number(data.cook_minutes ?? 0),
    };
}
