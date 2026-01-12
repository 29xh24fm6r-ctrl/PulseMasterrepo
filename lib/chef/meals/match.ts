import type { InventorySnapshotItem } from "@/lib/chef/inventory/readSnapshot";
import type { RecipeWithIngredients } from "@/lib/chef/recipes/readRecipes";

export type MealMatch = {
    recipe_id: string;
    title: string;
    cuisine: string | null;
    total_minutes: number | null;
    energy_profile: string | null;

    required_total: number;
    required_have: number;
    missing_required: Array<{ ingredient_id: string; canonical_name: string }>;
    missing_optional: Array<{ ingredient_id: string; canonical_name: string }>;

    score: number; // higher better
    bucket: "can_make_now" | "one_away" | "needs_shop";
};

export function matchRecipesToInventory(args: {
    inventory: InventorySnapshotItem[];
    recipes: RecipeWithIngredients[];
    min_confidence?: number; // default 0.55
}): MealMatch[] {
    const minConfidence = args.min_confidence ?? 0.55;

    const have = new Map<string, InventorySnapshotItem>();
    for (const item of args.inventory) {
        if (item.max_confidence >= minConfidence) have.set(item.ingredient_id, item);
    }

    const out: MealMatch[] = [];

    for (const r of args.recipes) {
        const req = r.ingredients.filter((x) => x.required);
        const opt = r.ingredients.filter((x) => !x.required);

        const missingRequired: MealMatch["missing_required"] = [];
        const missingOptional: MealMatch["missing_optional"] = [];

        let requiredHave = 0;

        for (const ing of req) {
            if (have.has(ing.ingredient_id)) requiredHave += 1;
            else missingRequired.push({ ingredient_id: ing.ingredient_id, canonical_name: ing.canonical_name });
        }

        for (const ing of opt) {
            if (!have.has(ing.ingredient_id)) {
                missingOptional.push({ ingredient_id: ing.ingredient_id, canonical_name: ing.canonical_name });
            }
        }

        const requiredTotal = req.length || 1;
        const overlap = requiredHave / requiredTotal;

        // Score:
        // - Strongly penalize missing required
        // - Prefer higher overlap
        // - Slightly reward optional coverage
        const optionalHave = opt.length - missingOptional.length;
        const optionalBonus = opt.length ? optionalHave / opt.length : 0;

        const missingReqCount = missingRequired.length;

        let bucket: MealMatch["bucket"] = "needs_shop";
        if (missingReqCount === 0) bucket = "can_make_now";
        else if (missingReqCount === 1) bucket = "one_away";

        const totalMinutes =
            (r.prep_minutes ?? 0) + (r.cook_minutes ?? 0) > 0 ? (r.prep_minutes ?? 0) + (r.cook_minutes ?? 0) : null;

        const timePenalty = totalMinutes == null ? 0 : Math.min(totalMinutes / 120, 1) * 0.15; // modest penalty up to 2h

        const score =
            overlap * 1.0 +
            optionalBonus * 0.15 -
            missingReqCount * 0.75 -
            timePenalty;

        out.push({
            recipe_id: r.id,
            title: r.title,
            cuisine: r.cuisine,
            total_minutes: totalMinutes,
            energy_profile: r.energy_profile,
            required_total: req.length,
            required_have: requiredHave,
            missing_required: missingRequired,
            missing_optional: missingOptional,
            score,
            bucket,
        });
    }

    // Sort: bucket priority then score
    const bucketRank = { can_make_now: 0, one_away: 1, needs_shop: 2 } as const;
    out.sort((a, b) => {
        const br = bucketRank[a.bucket] - bucketRank[b.bucket];
        if (br !== 0) return br;
        return b.score - a.score;
    });

    return out;
}
