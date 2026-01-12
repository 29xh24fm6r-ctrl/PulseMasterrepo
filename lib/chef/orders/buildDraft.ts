import type { ChefOrderDraftItem } from "./types";

export function buildDraftItemsFromMatch(args: {
    missing_required: Array<{ ingredient_id?: string; canonical_name: string }>;
    missing_optional?: Array<{ ingredient_id?: string; canonical_name: string }>;
    include_optional: boolean;
    title: string;
}): { items: ChefOrderDraftItem[]; notes: string[] } {
    const items: ChefOrderDraftItem[] = [];
    const notes: string[] = [];

    for (const m of args.missing_required) {
        items.push({
            ingredient_id: m.ingredient_id,
            canonical_name: m.canonical_name.trim().toLowerCase(),
            quantity_hint: undefined,
            required: true,
            source: "missing_required",
        });
    }

    if (args.include_optional && args.missing_optional?.length) {
        for (const m of args.missing_optional) {
            items.push({
                ingredient_id: m.ingredient_id,
                canonical_name: m.canonical_name.trim().toLowerCase(),
                quantity_hint: undefined,
                required: false,
                source: "missing_optional",
            });
        }
        notes.push("Included optional items.");
    }

    notes.push(`Draft built from meal: ${args.title}`);
    return { items, notes };
}

export function normalizeManualItems(items: ChefOrderDraftItem[]): ChefOrderDraftItem[] {
    const seen = new Set<string>();
    const out: ChefOrderDraftItem[] = [];

    for (const it of items) {
        const key = it.canonical_name.trim().toLowerCase();
        if (!key) continue;
        if (seen.has(key)) continue;
        seen.add(key);

        out.push({
            ingredient_id: it.ingredient_id,
            canonical_name: key,
            quantity_hint: it.quantity_hint,
            required: it.required ?? true,
            source: it.source ?? "manual",
        });
    }

    return out;
}
