export function canonicalizeIngredientName(raw: string): string {
    const s = raw.trim().toLowerCase();

    // V1: minimal normalization. We’ll evolve this into synonym clusters later.
    return s
        .replace(/\b(fresh|organic|large|small|extra\s*large)\b/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

export function inferCategory(name: string): string {
    // V1 heuristic; later becomes a proper taxonomy.
    if (/(chicken|beef|pork|fish|shrimp|egg|eggs|turkey|tofu)/.test(name)) return "protein";
    if (/(milk|cheese|yogurt|butter|cream)/.test(name)) return "dairy";
    if (/(spinach|kale|lettuce|pepper|onion|garlic|tomato|carrot|broccoli)/.test(name)) return "produce";
    if (/(bread|tortilla|rice|pasta|oats|flour)/.test(name)) return "carb";
    if (/(oil|vinegar|salt|pepper|spice|soy sauce|hot sauce)/.test(name)) return "pantry";
    return "other";
}
