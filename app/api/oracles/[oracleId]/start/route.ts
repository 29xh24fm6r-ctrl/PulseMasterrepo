// app/api/oracles/[oracleId]/start/route.ts
import { NextRequest } from "next/server";
import { requireOwnerUserId } from "@/lib/auth/requireOwnerUserId";
import { createRun, setRunStatus } from "@/lib/runs/db";
import { emit } from "@/lib/runs/emit";
import { getOracle } from "@/lib/oracles/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: { oracleId: string } }) {
    const owner = requireOwnerUserId(req);
    const oracleId = ctx.params.oracleId;

    const oracle = getOracle(oracleId);
    if (!oracle) return Response.json({ error: "unknown_oracle" }, { status: 404 });

    const body = await safeJson(req);
    const input = body?.input ?? {};
    const client_context = body?.context ?? {};

    const runId = await createRun({
        owner_user_id: owner,
        kind: "oracle",
        key: `oracle:${oracleId}`,
        status: "running",
        input,
        client_context,
        privacy: {},
    });

    await emit(owner, runId, "RUN_STARTED", { kind: "oracle", oracle_id: oracleId, title: oracle.title });
    await emit(owner, runId, "INPUT_ACCEPTED", { input, context: client_context });

    try {
        // Minimal deterministic stub execution (observable)
        for (const s of oracle.steps) {
            await emit(owner, runId, "STEP_STARTED", { step: s.step });

            if (s.step === "validate") {
                await sleep(120);
                await emit(owner, runId, "STEP_DONE", { step: s.step, ok: true });
                continue;
            }

            if (s.step === "create_lead_stub") {
                await sleep(180);
                await emit(owner, runId, "STEP_LOG", { msg: "Lead captured (stub). Replace with real contact ingestion later." });
                await emit(owner, runId, "STEP_DONE", { step: s.step, lead_id: "stub_lead_001" });
                continue;
            }

            await sleep(80);
            await emit(owner, runId, "STEP_DONE", { step: s.step });
        }

        const output = {
            oracle_id: oracleId,
            result: "succeeded",
            lead_id: "stub_lead_001",
        };

        await setRunStatus({ run_id: runId, owner_user_id: owner, status: "succeeded", output });
        await emit(owner, runId, "RUN_DONE", { output });
    } catch {
        await setRunStatus({
            run_id: runId,
            owner_user_id: owner,
            status: "failed",
            error: { message: "oracle_failed" },
        });
        await emit(owner, runId, "RUN_FAILED", { message: "oracle_failed" });
    }

    return Response.json({ run_id: runId });
}

async function safeJson(req: NextRequest) {
    try {
        return await req.json();
    } catch {
        return null;
    }
}

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}
