import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export type RecipeSteps = {
    recipe_id: string;
    title: string;
    steps: string[];
};

export async function readRecipeSteps(recipe_id: string): Promise<RecipeSteps> {
    const sb = getSupabaseAdminRuntimeClient();

    const { data, error } = await sb
        .from("chef_recipes")
        .select("id,title,instructions")
        .eq("id", recipe_id)
        .single();

    if (error) throw error;

    const instructions = (data.instructions ?? {}) as any;
    const steps = Array.isArray(instructions.steps) ? instructions.steps.filter((s: any) => typeof s === "string") : [];

    return {
        recipe_id: data.id,
        title: data.title,
        steps,
    };
}
