import { NextRequest } from "next/server";
import { requireOwnerUserId } from "@/lib/auth/requireOwnerUserId";
import { createRun, setRunStatus } from "@/lib/runs/db";
import { emit } from "@/lib/runs/emit";
import { buildConsentProposal } from "@/lib/anticipation/buildConsentProposal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const owner = requireOwnerUserId(req);
    const { insight } = await req.json();

    const proposal = buildConsentProposal(insight);
    if (!proposal) {
        return Response.json({ skipped: true });
    }

    const runId = await createRun({
        owner_user_id: owner,
        kind: "system",
        key: "anticipation_consent_v1",
        status: "running",
        input: { insight },
    });

    await emit(owner, runId, "RUN_STARTED", { kind: "system" });
    await emit(owner, runId, "STEP_STARTED", { step: "build_consent_proposal" });

    await emit(owner, runId, "STEP_DONE", {
        step: "build_consent_proposal",
        proposal,
    });

    await setRunStatus({
        run_id: runId,
        owner_user_id: owner,
        status: "succeeded",
        output: { proposal },
    });

    await emit(owner, runId, "RUN_DONE", { proposal });

    return Response.json({ run_id: runId });
}
