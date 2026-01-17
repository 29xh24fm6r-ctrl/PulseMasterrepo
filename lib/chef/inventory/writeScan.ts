import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { canonicalizeIngredientName, inferCategory } from "./canonicalize";
import type { ChefDetectedItem } from "@/lib/chef/vision/types";

type WriteScanArgs = {
    owner_user_id: string;
    location: "fridge" | "pantry";
    source: "photo";
    detected: ChefDetectedItem[];
};

export async function writeInventoryScan(args: WriteScanArgs): Promise<{
    ingredients_created: number;
    inventory_rows_inserted: number;
}> {
    const sb = getSupabaseAdminRuntimeClient();

    let ingredientsCreated = 0;
    let inventoryInserted = 0;

    for (const item of args.detected) {
        const canonical = canonicalizeIngredientName(item.name);
        if (!canonical) continue;

        // 1) Ensure ingredient exists
        const { data: existing, error: selErr } = await sb
            .from("chef_ingredients")
            .select("id")
            .ilike("canonical_name", canonical)
            .limit(1);

        if (selErr) throw selErr;

        let ingredientId: string | null = existing?.[0]?.id ?? null;

        if (!ingredientId) {
            const { data: ins, error: insErr } = await sb
                .from("chef_ingredients")
                .insert({
                    canonical_name: canonical,
                    category: inferCategory(canonical),
                    shelf_life_days: null,
                })
                .select("id")
                .single();

            if (insErr) throw insErr;
            ingredientId = ins.id;
            ingredientsCreated += 1;
        }

        // 2) Insert inventory item row
        // V1 behavior: insert a new row each scan; later we’ll implement dedupe/merge windows.
        const expiresAt = null; // V1: we’ll add shelf-life based expiry calc in Phase 2.5

        const { error: invErr } = await sb.from("chef_inventory_items").insert({
            owner_user_id: args.owner_user_id,
            ingredient_id: ingredientId,
            confidence_score: item.confidence,
            freshness_score: item.freshness ?? null,
            source: args.source,
            last_confirmed_at: null,
            expires_at: expiresAt,
        });

        if (invErr) throw invErr;
        inventoryInserted += 1;
    }

    return { ingredients_created: ingredientsCreated, inventory_rows_inserted: inventoryInserted };
}
