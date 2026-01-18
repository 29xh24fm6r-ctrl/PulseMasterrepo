// app/api/voice/quick-talk/start/route.ts
import { NextRequest } from "next/server";
import { requireOwnerUserId } from "@/lib/auth/requireOwnerUserId";
import { createRun, setRunStatus } from "@/lib/runs/db";
import { emit } from "@/lib/runs/emit";
import { classifyVoiceIntent } from "@/lib/intent/classifyVoiceIntent";
import { captureAttentionArtifact } from "@/lib/memory/captureAttentionArtifact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * V1 “Pulse Way”:
 * - Creates a run
 * - Emits events
 * - Returns run_id immediately
 * - Uses stub transcription for now (safe foundation)
 *
 * Antigravity can swap transcribeStub() with real STT later without touching UI.
 */

async function transcribeStub(): Promise<{ transcript: string; latency_ms: number }> {
    const started = Date.now();
    // simulate work
    await new Promise((r) => setTimeout(r, 150));
    return { transcript: "[quick talk wired] (stub transcript)", latency_ms: Date.now() - started };
}

export async function POST(req: NextRequest) {
    const owner = requireOwnerUserId(req);

    const form = await req.formData();

    // Context frame is optional but encouraged
    const contextRaw = String(form.get("context") ?? "{}");
    let context: any = {};
    try {
        context = JSON.parse(contextRaw);
    } catch {
        context = {};
    }

    const privacy = {
        store_audio: false,
    };

    const runId = await createRun({
        owner_user_id: owner,
        kind: "voice",
        key: "quick_talk_v1",
        status: "running",
        input: { has_audio: Boolean(form.get("audio")) },
        client_context: context,
        privacy,
    });

    // Emit start immediately
    await emit(owner, runId, "RUN_STARTED", { kind: "voice", key: "quick_talk_v1" });
    await emit(owner, runId, "INPUT_ACCEPTED", { context });

    // Fire and finish inline (v1). Later can be backgrounded safely.
    try {
        await emit(owner, runId, "STEP_STARTED", { step: "transcribe" });

        const tr = await transcribeStub();

        await emit(owner, runId, "STEP_DONE", { step: "transcribe", latency_ms: tr.latency_ms });

        await emit(owner, runId, "STEP_STARTED", { step: "intent_classification" });

        const intent = classifyVoiceIntent({ transcript: tr.transcript, context });

        await emit(owner, runId, "STEP_DONE", { step: "intent_classification", intent });

        // Memory capture (non-prescriptive): detect forgetting language patterns
        const tl = tr.transcript.toLowerCase();
        if (tl.includes("forget") || tl.includes("remind me") || tl.includes("don't let me forget")) {
            await captureAttentionArtifact({
                owner_user_id: owner,
                source: "voice",
                artifact_type: "reminder_candidate",
                content: tr.transcript,
                context,
                confidence: intent.confidence,
            });
            await emit(owner, runId, "STEP_LOG", { msg: "Captured attention artifact: reminder_candidate" });
        }

        const output = {
            transcript: tr.transcript,
            intent,
            confidence: intent.confidence,
            debug: { latency_ms: tr.latency_ms },
        };

        await setRunStatus({
            run_id: runId,
            owner_user_id: owner,
            status: "succeeded",
            output,
        });

        await emit(owner, runId, "RUN_DONE", { output });
    } catch (e: any) {
        await setRunStatus({
            run_id: runId,
            owner_user_id: owner,
            status: "failed",
            error: { message: "quick_talk_failed" },
        });

        await emit(owner, runId, "RUN_FAILED", { message: "quick_talk_failed" });
    }

    return Response.json({ run_id: runId });
}
