import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizePolicy } from "@/lib/payments/policy";

export async function getOrCreatePaymentProfile(owner_user_id: string) {
    const supabase = getSupabaseAdmin();

    const { data: existing, error: e1 } = await supabase
        .from("payment_profiles")
        .select("*")
        .eq("owner_user_id", owner_user_id)
        .maybeSingle();

    if (e1) throw e1;
    if (existing) return existing;

    const { data: created, error: e2 } = await supabase
        .from("payment_profiles")
        .insert({ owner_user_id })
        .select("*")
        .single();

    if (e2) throw e2;
    return created;
}

export async function getActivePolicy(owner_user_id: string) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from("spending_policies")
        .select("*")
        .eq("owner_user_id", owner_user_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    if (!data) {
        // Create default policy if missing
        const { data: created, error: e2 } = await supabase
            .from("spending_policies")
            .insert({ owner_user_id })
            .select("*")
            .single();
        if (e2) throw e2;
        return normalizePolicy(created);
    }

    return normalizePolicy(data);
}

export async function sumTodaysSpendCents(owner_user_id: string) {
    const supabase = getSupabaseAdmin();
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
        .from("purchase_receipts")
        .select("amount_cents")
        .eq("owner_user_id", owner_user_id)
        .gte("created_at", start.toISOString())
        .limit(500);

    if (error) throw error;
    return (data ?? []).reduce((acc: number, r: any) => acc + Number(r.amount_cents ?? 0), 0);
}

export async function insertReceipt(args: {
    owner_user_id: string;
    run_id: string;
    merchant_key: string;
    category: string;
    amount_cents: number;
    currency: string;
    stripe_charge_id?: string | null;
    stripe_payment_intent_id?: string | null;
    stripe_issuing_card_id?: string | null;
    summary?: string | null;
    metadata?: any;
}) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("purchase_receipts").insert({
        owner_user_id: args.owner_user_id,
        run_id: args.run_id,
        merchant_key: args.merchant_key,
        category: args.category,
        amount_cents: args.amount_cents,
        currency: args.currency,
        stripe_charge_id: args.stripe_charge_id ?? null,
        stripe_payment_intent_id: args.stripe_payment_intent_id ?? null,
        stripe_issuing_card_id: args.stripe_issuing_card_id ?? null,
        summary: args.summary ?? null,
        metadata: args.metadata ?? {},
    });

    if (error) throw error;
}
