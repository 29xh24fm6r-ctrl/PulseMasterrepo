export type ConfirmMode = "ALWAYS_ASK" | "ASK_ABOVE_THRESHOLD" | "AUTO_BELOW_THRESHOLD";

export type SpendPolicy = {
    allowed_merchants: string[];
    allowed_categories: string[];
    max_per_purchase_cents: number;
    max_per_day_cents: number;
    confirm_mode: ConfirmMode;
    confirm_threshold_cents: number;
};

export function normalizePolicy(row: any): SpendPolicy {
    return {
        allowed_merchants: Array.isArray(row.allowed_merchants) ? row.allowed_merchants : [],
        allowed_categories: Array.isArray(row.allowed_categories) ? row.allowed_categories : [],
        max_per_purchase_cents: Number(row.max_per_purchase_cents ?? 2500),
        max_per_day_cents: Number(row.max_per_day_cents ?? 7500),
        confirm_mode: (row.confirm_mode ?? "ALWAYS_ASK") as ConfirmMode,
        confirm_threshold_cents: Number(row.confirm_threshold_cents ?? 1500),
    };
}

export function checkAllowed(policy: SpendPolicy, args: { merchant_key: string; category: string; amount_cents: number }) {
    if (args.amount_cents > policy.max_per_purchase_cents) {
        return { ok: false as const, reason: "over_max_per_purchase" };
    }
    if (policy.allowed_merchants.length && !policy.allowed_merchants.includes(args.merchant_key)) {
        return { ok: false as const, reason: "merchant_not_allowed" };
    }
    if (policy.allowed_categories.length && !policy.allowed_categories.includes(args.category)) {
        return { ok: false as const, reason: "category_not_allowed" };
    }
    return { ok: true as const };
}

export function requiresConfirmation(policy: SpendPolicy, amount_cents: number) {
    if (policy.confirm_mode === "ALWAYS_ASK") return true;
    if (policy.confirm_mode === "ASK_ABOVE_THRESHOLD") return amount_cents > policy.confirm_threshold_cents;
    if (policy.confirm_mode === "AUTO_BELOW_THRESHOLD") return amount_cents > policy.confirm_threshold_cents;
    return true;
}
