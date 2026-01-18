import { NextRequest } from "next/server";
import { requireOwnerUserId } from "@/lib/auth/requireOwnerUserId";
import { createRun, setRunStatus } from "@/lib/runs/db";
import { emit } from "@/lib/runs/emit";
import { getActivePolicy, sumTodaysSpendCents } from "@/lib/payments/db";
import { checkAllowed, requiresConfirmation } from "@/lib/payments/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const owner = requireOwnerUserId(req);
    const { merchant_key, category, amount_cents, currency = "usd", context = {} } = await req.json();

    const runId = await createRun({
        owner_user_id: owner,
        kind: "tool",
        key: "purchase_prepare_v1",
        status: "running",
        input: { merchant_key, category, amount_cents, currency },
        client_context: context,
    });

    await emit(owner, runId, "RUN_STARTED", { kind: "tool", key: "purchase_prepare_v1" });

    try {
        await emit(owner, runId, "STEP_STARTED", { step: "policy_check" });

        const policy = await getActivePolicy(owner);
        const allowed = checkAllowed(policy, { merchant_key, category, amount_cents });

        if (!allowed.ok) {
            await emit(owner, runId, "STEP_DONE", { step: "policy_check", ok: false, reason: allowed.reason });
            await setRunStatus({ run_id: runId, owner_user_id: owner, status: "failed", error: { reason: allowed.reason } });
            await emit(owner, runId, "RUN_FAILED", { reason: allowed.reason });
            return Response.json({ run_id: runId, ok: false, reason: allowed.reason });
        }

        const spentToday = await sumTodaysSpendCents(owner);
        if (spentToday + amount_cents > policy.max_per_day_cents) {
            const reason = "over_max_per_day";
            await emit(owner, runId, "STEP_DONE", { step: "policy_check", ok: false, reason });
            await setRunStatus({ run_id: runId, owner_user_id: owner, status: "failed", error: { reason } });
            await emit(owner, runId, "RUN_FAILED", { reason });
            return Response.json({ run_id: runId, ok: false, reason });
        }

        const needsConfirm = requiresConfirmation(policy, amount_cents);

        await emit(owner, runId, "STEP_DONE", { step: "policy_check", ok: true, needsConfirm });

        const output = {
            ok: true,
            needsConfirm,
            proposal: {
                merchant_key,
                category,
                amount_cents,
                currency,
            },
        };

        await setRunStatus({ run_id: runId, owner_user_id: owner, status: "succeeded", output });
        await emit(owner, runId, "RUN_DONE", { output });

        return Response.json({ run_id: runId, ...output });
    } catch {
        await setRunStatus({ run_id: runId, owner_user_id: owner, status: "failed", error: { message: "prepare_failed" } });
        await emit(owner, runId, "RUN_FAILED", { reason: "prepare_failed" });
        return Response.json({ run_id: runId, ok: false, reason: "prepare_failed" }, { status: 500 });
    }
}
