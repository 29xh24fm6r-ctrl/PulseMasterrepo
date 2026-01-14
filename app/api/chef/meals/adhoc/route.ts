import { NextResponse } from "next/server";
import { z } from "zod";
import { readInventorySnapshot } from "@/lib/chef/inventory/readSnapshot";
import { readRecipesWithIngredients } from "@/lib/chef/recipes/readRecipes";
import { matchRecipesToInventory } from "@/lib/chef/meals/match";

function requireOwnerUserId(req: Request): string {
    const owner = req.headers.get("x-owner-user-id");
    if (!owner) throw new Error("Missing x-owner-user-id (temporary dev auth)");
    return owner;
}

const QuerySchema = z.object({
    max_minutes: z.coerce.number().int().min(1).max(240).optional(),
    cuisine: z.string().min(1).optional(),
    energy_profile: z.string().min(1).optional(),
    min_confidence: z.coerce.number().min(0).max(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        const owner_user_id = requireOwnerUserId(req);
        const url = new URL(req.url);

        const q = QuerySchema.parse({
            max_minutes: url.searchParams.get("max_minutes") ?? undefined,
            cuisine: url.searchParams.get("cuisine") ?? undefined,
            energy_profile: url.searchParams.get("energy_profile") ?? undefined,
            min_confidence: url.searchParams.get("min_confidence") ?? undefined,
            limit: url.searchParams.get("limit") ?? undefined,
        });

        const inventory = await readInventorySnapshot({ owner_user_id, within_days: 14 });

        const recipes = await readRecipesWithIngredients({
            cuisine: q.cuisine,
            energy_profile: q.energy_profile,
            max_minutes: q.max_minutes,
            limit: 250,
        });

        const matches = matchRecipesToInventory({
            inventory,
            recipes,
            min_confidence: q.min_confidence ?? 0.55,
        });

        const limit = q.limit ?? 25;
        const top = matches.slice(0, limit);

        // Bucketed response (nice for UI)
        const response = {
            ok: true,
            inventory_count: inventory.length,
            recipe_count: recipes.length,
            result_count: top.length,
            buckets: {
                can_make_now: top.filter((m) => m.bucket === "can_make_now"),
                one_away: top.filter((m) => m.bucket === "one_away"),
                needs_shop: top.filter((m) => m.bucket === "needs_shop"),
            },
            // Matches are also returned flat in result ranking order
            ranked_matches: top
        };

        return NextResponse.json(response);
    } catch (err: any) {
        return NextResponse.json(
            { ok: false, error: err?.message || "Unknown error" },
            { status: 500 }
        );
    }
}
