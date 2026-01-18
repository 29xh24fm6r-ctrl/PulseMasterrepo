import { NextRequest } from "next/server";
import { requireOwnerUserId } from "@/lib/auth/requireOwnerUserId";
import { createRun, setRunStatus } from "@/lib/runs/db";
import { emit } from "@/lib/runs/emit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOrCreatePaymentProfile, getActivePolicy, sumTodaysSpendCents, insertReceipt } from "@/lib/payments/db";
import { checkAllowed } from "@/lib/payments/policy";
import { ensureCardholder, createVirtualCard } from "@/lib/payments/issuing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * V1 executes a bounded payment by issuing a virtual card.
 * "Place order" is stubbed (later: integrations/browser agent/call).
 */
export async function POST(req: NextRequest) {
    const owner = requireOwnerUserId(req);
    const { merchant_key, category, amount_cents, currency = "usd", context = {} } = await req.json();

    const runId = await createRun({
        owner_user_id: owner,
        kind: "tool",
        key: "purchase_execute_v1",
        status: "running",
        input: { merchant_key, category, amount_cents, currency },
        client_context: context,
        privacy: { store_pan: false },
    });

    await emit(owner, runId, "RUN_STARTED", { kind: "tool", key: "purchase_execute_v1" });

    const supabase = getSupabaseAdmin();

    try {
        await emit(owner, runId, "STEP_STARTED", { step: "policy_recheck" });

        const policy = await getActivePolicy(owner);
        const allowed = checkAllowed(policy, { merchant_key, category, amount_cents });
        if (!allowed.ok) {
            await emit(owner, runId, "STEP_DONE", { step: "policy_recheck", ok: false, reason: allowed.reason });
            throw new Error(allowed.reason);
        }

        const spentToday = await sumTodaysSpendCents(owner);
        if (spentToday + amount_cents > policy.max_per_day_cents) throw new Error("over_max_per_day");

        await emit(owner, runId, "STEP_DONE", { step: "policy_recheck", ok: true });

        await emit(owner, runId, "STEP_STARTED", { step: "load_payment_profile" });
        const profile = await getOrCreatePaymentProfile(owner);

        if (!profile.stripe_customer_id || !profile.stripe_default_payment_method_id) {
            throw new Error("no_payment_method");
        }

        await emit(owner, runId, "STEP_DONE", { step: "load_payment_profile", ok: true, display_label: profile.display_label });

        await emit(owner, runId, "STEP_STARTED", { step: "ensure_cardholder" });

        const cardholderId = await ensureCardholder({
            owner_user_id: owner,
            stripe_customer_id: profile.stripe_customer_id,
            existing_cardholder_id: profile.stripe_issuing_cardholder_id,
        });

        if (!profile.stripe_issuing_cardholder_id) {
            await supabase
                .from("payment_profiles")
                .update({ stripe_issuing_cardholder_id: cardholderId, updated_at: new Date().toISOString() })
                .eq("owner_user_id", owner);
        }

        await emit(owner, runId, "STEP_DONE", { step: "ensure_cardholder", cardholder_id: cardholderId });

        await emit(owner, runId, "STEP_STARTED", { step: "issue_virtual_card" });

        const card = await createVirtualCard({
            cardholder_id: cardholderId,
            spending_limit_cents: amount_cents,
            spending_limit_interval: "per_authorization",
        });

        await emit(owner, runId, "STEP_DONE", { step: "issue_virtual_card", card_id: card.id });

        // Stub “place order”
        await emit(owner, runId, "STEP_STARTED", { step: "place_order_stub" });
        await sleep(250);
        await emit(owner, runId, "STEP_DONE", { step: "place_order_stub", ok: true, note: "Replace with real merchant integration/agent." });

        // Record receipt (even stubbed)
        await emit(owner, runId, "STEP_STARTED", { step: "record_receipt" });
        await insertReceipt({
            owner_user_id: owner,
            run_id: runId,
            merchant_key,
            category,
            amount_cents,
            currency,
            stripe_issuing_card_id: card.id,
            summary: `Issued virtual card for ${merchant_key} (${category})`,
            metadata: { issuing_card: { id: card.id } },
        });
        await emit(owner, runId, "STEP_DONE", { step: "record_receipt" });

        const output = {
            ok: true,
            merchant_key,
            category,
            amount_cents,
            currency,
            issuing_card_id: card.id,
            display_label: profile.display_label,
        };

        await setRunStatus({ run_id: runId, owner_user_id: owner, status: "succeeded", output });
        await emit(owner, runId, "RUN_DONE", { output });

        return Response.json({ run_id: runId, ...output });
    } catch (e: any) {
        const reason = String(e?.message || "execute_failed");
        await setRunStatus({ run_id: runId, owner_user_id: owner, status: "failed", error: { reason } });
        await emit(owner, runId, "RUN_FAILED", { reason });
        return Response.json({ run_id: runId, ok: false, reason }, { status: 400 });
    }
}

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}
