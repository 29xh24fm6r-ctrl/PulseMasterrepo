import { supabaseAdmin } from "@/lib/supabase/admin";

export type RecipeWithIngredients = {
    id: string;
    title: string;
    cuisine: string | null;
    prep_minutes: number | null;
    cook_minutes: number | null;
    energy_profile: string | null;
    instructions: any;
    ingredients: Array<{
        ingredient_id: string;
        canonical_name: string;
        required: boolean;
        substitute_group: string | null;
    }>;
};

export async function readRecipesWithIngredients(args?: {
    cuisine?: string;
    energy_profile?: string;
    max_minutes?: number;
    limit?: number;
}) {
    const sb = supabaseAdmin();
    const limit = args?.limit ?? 200;

    // 1) Recipes
    let q = sb
        .from("chef_recipes")
        .select("id,title,cuisine,prep_minutes,cook_minutes,energy_profile,instructions")
        .limit(limit);

    if (args?.cuisine) q = q.ilike("cuisine", args.cuisine);
    if (args?.energy_profile) q = q.ilike("energy_profile", args.energy_profile);

    const { data: recipes, error: rErr } = await q;
    if (rErr) throw rErr;

    const recipeIds = (recipes ?? []).map((r) => r.id);
    if (!recipeIds.length) return [];

    // 2) Join table
    const { data: joins, error: jErr } = await sb
        .from("chef_recipe_ingredients")
        .select("recipe_id, ingredient_id, required, substitute_group, chef_ingredients(canonical_name)")
        .in("recipe_id", recipeIds);

    if (jErr) throw jErr;

    const byRecipe = new Map<string, RecipeWithIngredients>();
    for (const r of recipes ?? []) {
        const total = (Number(r.prep_minutes ?? 0) + Number(r.cook_minutes ?? 0)) || null;
        if (args?.max_minutes != null && total != null && total > args.max_minutes) continue;

        byRecipe.set(r.id, {
            id: r.id,
            title: r.title,
            cuisine: r.cuisine ?? null,
            prep_minutes: r.prep_minutes ?? null,
            cook_minutes: r.cook_minutes ?? null,
            energy_profile: r.energy_profile ?? null,
            instructions: r.instructions ?? {},
            ingredients: [],
        });
    }

    for (const row of joins ?? []) {
        const rec = byRecipe.get(row.recipe_id as string);
        if (!rec) continue;

        rec.ingredients.push({
            ingredient_id: row.ingredient_id as string,
            canonical_name: (row as any).chef_ingredients?.canonical_name as string,
            required: Boolean(row.required),
            substitute_group: (row.substitute_group as string) ?? null,
        });
    }

    return Array.from(byRecipe.values());
}
