import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { readTraceHeaders, traceFromBody } from "@/lib/executions/traceHeaders";
import { execLog } from "@/lib/executions/logger";
import { linkArtifact } from "@/lib/executions/artifactLinks";
import { jsonError, rateLimitOrThrow, withTimeout } from "@/lib/api/guards";
import { getOpenAI } from "@/services/ai/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// const openai = ...

type TriageBody = {
    task_id: string;
};

type TriageResult = {
    priority: number; // -10..10
    context: string | null; // e.g. "work", "personal", "banking"
    status: "pending" | "active" | "blocked";
    due_at: string | null; // ISO
    defer_until: string | null; // ISO
    blocked_reason: string | null;
    rationale: string;
};

function clamp(n: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, n));
}

function safeIsoOrNull(x: any): string | null {
    if (!x) return null;
    const d = new Date(x);
    return isNaN(d.getTime()) ? null : d.toISOString();
}

async function runTriageLLM(input: { title: string; description: string | null }): Promise<TriageResult> {
    const openai = getOpenAI();
    // Deterministic fallback handled by getOpenAI or try/catch if needed
    /* if (!openai) { ... } */

    const system = [
        "You are Pulse, an execution triage engine.",
        "Return STRICT JSON only. No markdown. No extra keys.",
        "Choose:",
        "- priority: integer between -10 and 10",
        "- context: short string bucket or null",
        "- status: pending|active|blocked",
        "- due_at: ISO datetime string or null",
        "- defer_until: ISO datetime string or null",
        "- blocked_reason: string or null (required if status=blocked)",
        "- rationale: one sentence",
        "If unsure, keep due_at and defer_until null.",
    ].join("\n");

    const user = JSON.stringify(
        {
            now: new Date().toISOString(),
            task: { title: input.title, description: input.description },
            examples: [
                { title: "Pay rent", outcome: { priority: 6, context: "personal", status: "active" } },
                { title: "Email client follow-up", outcome: { priority: 4, context: "work", status: "pending" } },
                { title: "Waiting on docs from borrower", outcome: { priority: 3, context: "banking", status: "blocked" } },
            ],
        },
        null,
        2
    );

    const resp = await withTimeout(
        openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.2,
            messages: [
                { role: "system", content: system },
                { role: "user", content: user },
            ],
            response_format: { type: "json_object" },
        }),
        8000,
        "openai_timeout"
    );

    const raw = resp.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    const result: TriageResult = {
        priority: clamp(Number(parsed.priority ?? 0), -10, 10),
        context: typeof parsed.context === "string" ? parsed.context : null,
        status: parsed.status === "active" || parsed.status === "blocked" ? parsed.status : "pending",
        due_at: safeIsoOrNull(parsed.due_at),
        defer_until: safeIsoOrNull(parsed.defer_until),
        blocked_reason: typeof parsed.blocked_reason === "string" ? parsed.blocked_reason : null,
        rationale: typeof parsed.rationale === "string" ? parsed.rationale : "AI triage.",
    };

    if (result.status === "blocked" && !result.blocked_reason) {
        result.blocked_reason = "Blocked — needs input";
    }

    return result;
}

import { withJourney } from "@/services/observability/journey";
import { withPerf } from "@/services/observability/perf";
import { setObsContext } from "@/services/observability/context";
import { supabaseSpan } from "@/services/observability/supabaseSpan";

export async function POST(req: Request) {
    const access = await requireOpsAuth();
    if (!access.ok || !access.gate) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const userId = access.gate.canon.userIdUuid;

    setObsContext({
        userId,
        area: "tasks",
        feature: "triage",
        requestId: req.headers.get("x-request-id"),
    });

    return await withJourney({
        area: "tasks",
        feature: "triage",
        name: "tasks.triage",
        data: { method: "POST" },
        run: async () => {
            return await withPerf("tasks.triage.total", async () => {
                try {
                    await rateLimitOrThrow(userId, "tasks.triage");
                } catch (e: any) {
                    return jsonError(429, "rate_limited", "Too many triage requests", { retry_in_ms: e?.retry_in_ms ?? 0 });
                }

                const body = (await req.json()) as TriageBody;
                if (!body?.task_id) return NextResponse.json({ error: "missing_task_id" }, { status: 400 });

                const { traceId: hTrace, executionId: hExec } = readTraceHeaders(req);
                const { traceId: bTrace, executionId: bExec } = traceFromBody(body);
                const trace_id = hTrace ?? bTrace ?? null;
                const execution_id = hExec ?? bExec ?? null;

                if (execution_id && trace_id && userId) {
                    await execLog({
                        userId: userId,
                        executionId: execution_id,
                        traceId: trace_id,
                        message: "triage:route_enter",
                        meta: { task_id: body.task_id },
                    });
                }

                // Load task (ownership enforced)
                const { data: task, error: readErr } = await supabaseSpan("tasks.triage.fetch", async () =>
                    await supabaseAdmin
                        .from("tasks")
                        .select("id,title,description,status,priority,context,due_at,defer_until,blocked_reason")
                        .eq("id", body.task_id)
                        .eq("user_id_uuid", userId)
                        .single()
                );

                if (readErr || !task) {
                    return NextResponse.json({ error: "not_found" }, { status: 404 });
                }

                const triage = await withPerf("tasks.triage.llm", async () =>
                    await runTriageLLM({ title: task.title, description: task.description })
                );

                // Apply canonical updates
                const patch: Record<string, any> = {
                    priority: triage.priority,
                    context: triage.context,
                    status: triage.status,
                    due_at: triage.due_at,
                    defer_until: triage.defer_until,
                    blocked_reason: triage.blocked_reason,
                    ai_triage: triage,
                    ai_triaged_at: new Date().toISOString(),
                    trace_id: trace_id, // Stamp trace_id on task update
                };

                const tasksToInsert: any[] = []; // Placeholder per original logic

                const { data: newTasks, error: insErr } = await supabaseSpan("tasks.triage.insert_derived", async () =>
                    await supabaseAdmin
                        .from("tasks")
                        .insert(tasksToInsert)
                        .select("id")
                );

                // Link created tasks
                if (newTasks) {
                    await supabaseSpan("tasks.triage.link_artifacts", async () => {
                        for (const t of newTasks) {
                            await linkArtifact({
                                userId: userId,
                                traceId: trace_id,
                                executionId: execution_id,
                                fromType: "execution",
                                fromId: execution_id,
                                relation: "created",
                                meta: { source: "triage" },
                                toType: "task",
                                toId: t.id,
                            });
                        }
                    });
                }

                const { data: updated, error: updErr } = await supabaseSpan("tasks.triage.update", async () =>
                    await supabaseAdmin
                        .from("tasks")
                        .update(patch)
                        .eq("id", body.task_id)
                        .eq("user_id_uuid", userId)
                        .select("*")
                        .single()
                );

                if (updErr) {
                    return NextResponse.json({ error: "update_failed", detail: updErr.message }, { status: 500 });
                }

                return NextResponse.json({ item: updated, triage });
            });
        },
    });
}
