import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export type InventorySnapshotItem = {
    ingredient_id: string;
    canonical_name: string;
    max_confidence: number;
    max_freshness: number | null;
};

export async function readInventorySnapshot(args: {
    owner_user_id: string;
    // Only consider recent scans; V1 default 14 days
    within_days?: number;
}) {
    const sb = getSupabaseAdminRuntimeClient();
    const withinDays = args.within_days ?? 14;

    // Pull raw rows then reduce in JS to keep V1 simple + portable.
    const { data, error } = await sb
        .from("chef_inventory_items")
        .select("ingredient_id, confidence_score, freshness_score, created_at, chef_ingredients(canonical_name)")
        .eq("owner_user_id", args.owner_user_id)
        .gte("created_at", new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const map = new Map<string, InventorySnapshotItem>();

    for (const row of data ?? []) {
        const ingredient_id = row.ingredient_id as string;
        const name = (row as any).chef_ingredients?.canonical_name as string | undefined;

        if (!ingredient_id || !name) continue;

        const prev = map.get(ingredient_id);
        const c = Number(row.confidence_score ?? 0);
        const f = row.freshness_score == null ? null : Number(row.freshness_score);

        if (!prev) {
            map.set(ingredient_id, {
                ingredient_id,
                canonical_name: name,
                max_confidence: c,
                max_freshness: f,
            });
        } else {
            prev.max_confidence = Math.max(prev.max_confidence, c);
            if (f != null) prev.max_freshness = prev.max_freshness == null ? f : Math.max(prev.max_freshness, f);
        }
    }

    return Array.from(map.values());
}
