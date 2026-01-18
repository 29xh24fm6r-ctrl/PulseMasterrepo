import { NextRequest } from "next/server";
import { requireOwnerUserId } from "@/lib/auth/requireOwnerUserId";
import { createRun, setRunStatus } from "@/lib/runs/db";
import { emit } from "@/lib/runs/emit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateInsights } from "@/lib/insights/generateInsights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const owner = requireOwnerUserId(req);
    const supabase = getSupabaseAdmin();

    const runId = await createRun({
        owner_user_id: owner,
        kind: "system",
        key: "insight_generation_v1",
        status: "running",
    });

    await emit(owner, runId, "RUN_STARTED", { kind: "system" });

    const { data: artifacts } = await supabase
        .from("attention_artifacts")
        .select("*")
        .eq("owner_user_id", owner)
        .order("created_at", { ascending: false })
        .limit(50);

    const { data: runs } = await supabase
        .from("pulse_runs")
        .select("*")
        .eq("owner_user_id", owner)
        .order("started_at", { ascending: false })
        .limit(50);

    await emit(owner, runId, "STEP_STARTED", { step: "analyze_patterns" });

    const insights = generateInsights({
        attentionArtifacts: artifacts ?? [],
        runs: runs ?? [],
    });

    await emit(owner, runId, "STEP_DONE", { step: "analyze_patterns", insights });

    await setRunStatus({
        run_id: runId,
        owner_user_id: owner,
        status: "succeeded",
        output: { insights },
    });

    await emit(owner, runId, "RUN_DONE", { insights });

    return Response.json({ run_id: runId });
}
