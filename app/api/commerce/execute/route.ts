import { NextRequest } from "next/server";
import { requireOwnerUserId } from "@/lib/auth/requireOwnerUserId";
import { createRun, setRunStatus } from "@/lib/runs/db";
import { emit } from "@/lib/runs/emit";
import { discoverVendors } from "@/lib/commerce/discover";
import { selectExecutionLane } from "@/lib/commerce/selectLane";
import { ensureCardholder, createVirtualCard } from "@/lib/payments/issuing";
import { getOrCreatePaymentProfile, insertReceipt } from "@/lib/payments/db";
import { webExecutor } from "@/lib/commerce/executors/webExecutor";
import { phoneExecutor } from "@/lib/commerce/executors/phoneExecutor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const owner = requireOwnerUserId(req);
    const { request_text, location } = await req.json();

    const runId = await createRun({
        owner_user_id: owner,
        kind: "tool",
        key: "commerce_execute_v1",
        status: "running",
        input: { request_text, location },
    });

    await emit(owner, runId, "RUN_STARTED", { kind: "tool", key: "commerce_execute_v1" });

    // Discover
    await emit(owner, runId, "STEP_STARTED", { step: "discover" });
    const vendors = await discoverVendors({ query: request_text, city: location?.city });
    const chosen = vendors[0];
    await emit(owner, runId, "STEP_DONE", { step: "discover", chosen });

    // Payment setup
    const profile = await getOrCreatePaymentProfile(owner);
    const cardholderId = await ensureCardholder({
        owner_user_id: owner,
        stripe_customer_id: profile.stripe_customer_id,
        existing_cardholder_id: profile.stripe_issuing_cardholder_id,
    });

    const card = await createVirtualCard({
        cardholder_id: cardholderId,
        spending_limit_cents: chosen.estimated_amount_cents ?? 3000,
        spending_limit_interval: "per_authorization",
    });

    await emit(owner, runId, "STEP_DONE", { step: "issue_card", card_id: card.id });

    // Execute
    const lane = selectExecutionLane(chosen);
    const executor = lane === "web" ? webExecutor : phoneExecutor;

    await emit(owner, runId, "STEP_STARTED", { step: "execute", lane });

    const result = await executor.execute(
        { owner_user_id: owner, request_text },
        chosen,
        card.id
    );

    await emit(owner, runId, "STEP_DONE", { step: "execute", result });

    // Receipt
    await insertReceipt({
        owner_user_id: owner,
        run_id: runId,
        merchant_key: chosen.name.toLowerCase().replace(/\s/g, "_"),
        category: "food",
        amount_cents: result.final_amount_cents,
        currency: "usd",
        stripe_issuing_card_id: card.id,
        summary: result.receipt_summary,
    });

    await setRunStatus({
        run_id: runId,
        owner_user_id: owner,
        status: "succeeded",
        output: result,
    });

    await emit(owner, runId, "RUN_DONE", { result });

    return Response.json({ ok: true, run_id: runId, result });
}
