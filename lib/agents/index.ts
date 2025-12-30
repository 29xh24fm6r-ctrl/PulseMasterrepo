// lib/agents/index.ts
import { z } from "zod";

/**
 * Build-safe Agents module + minimal "Run" lifecycle.
 * This keeps /api/agents and /api/agents/[runId] stable even before the full agent system evolves.
 *
 * Storage is in-memory (Map) to avoid DB coupling. In production/serverless, this won't persist
 * across cold starts — which is OK for now because the goal is: BUILD GREEN + stable contracts.
 * Later: replace RunStore with Supabase-backed persistence without changing route contracts.
 */

export type AgentId = string;

export const AgentRunInputSchema = z.object({
    agent_id: z.string().min(1),
    input: z.string().min(1),
    context: z.any().optional(),
});

export type AgentRunInput = z.infer<typeof AgentRunInputSchema>;

export type AgentDefinition = {
    id: AgentId;
    name: string;
    description: string;
    enabled: boolean;
};

export type AgentRunResult = {
    ok: boolean;
    agent_id: AgentId;
    output: string;
    meta?: Record<string, any>;
};

/** ---------------------------
 * Run lifecycle (for /api/agents/[runId])
 * --------------------------*/

export type AgentRunStatus = "queued" | "running" | "completed" | "aborted" | "failed";

export type AgentRunRecord = {
    run_id: string;
    agent_id: AgentId;
    status: AgentRunStatus;
    created_at: string;
    updated_at: string;
    input: string;
    context?: Record<string, any>;
    output?: string;
    error?: string;
};

export type AgentRunMessage = {
    id: string;
    run_id: string;
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    created_at: string;
    meta?: Record<string, any>;
};

// Simple id generator that is deterministic enough for now.
function makeId(prefix: string) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
    return new Date().toISOString();
}

/**
 * In-memory run store.
 * IMPORTANT: This is for build safety + local dev.
 */
const RunStore = {
    runs: new Map<string, AgentRunRecord>(),
    messages: new Map<string, AgentRunMessage[]>(),
};

function pushMessage(msg: AgentRunMessage) {
    const arr = RunStore.messages.get(msg.run_id) ?? [];
    arr.push(msg);
    RunStore.messages.set(msg.run_id, arr);
}

function ensureRun(run_id: string): AgentRunRecord | null {
    return RunStore.runs.get(run_id) ?? null;
}

/** Public Run APIs required by route(s) */
export async function getRun(runId: string): Promise<AgentRunRecord | null> {
    return ensureRun(runId);
}

export async function getRunMessages(runId: string): Promise<AgentRunMessage[]> {
    return RunStore.messages.get(runId) ?? [];
}

export async function completeRun(runId: string, output: string): Promise<AgentRunRecord | null> {
    const run = ensureRun(runId);
    if (!run) return null;

    const updated: AgentRunRecord = {
        ...run,
        status: "completed",
        output,
        updated_at: nowIso(),
    };
    RunStore.runs.set(runId, updated);

    pushMessage({
        id: makeId("msg"),
        run_id: runId,
        role: "assistant",
        content: output,
        created_at: nowIso(),
        meta: { event: "completeRun" },
    });

    return updated;
}

export async function abortRun(runId: string, reason?: string): Promise<AgentRunRecord | null> {
    const run = ensureRun(runId);
    if (!run) return null;

    const updated: AgentRunRecord = {
        ...run,
        status: "aborted",
        error: reason ?? "aborted",
        updated_at: nowIso(),
    };
    RunStore.runs.set(runId, updated);

    pushMessage({
        id: makeId("msg"),
        run_id: runId,
        role: "system",
        content: `Run aborted${reason ? `: ${reason}` : ""}`,
        created_at: nowIso(),
        meta: { event: "abortRun" },
    });

    return updated;
}

/** ---------------------------
 * Agent registry + execution
 * --------------------------*/

const registry: AgentDefinition[] = [
    {
        id: "pulse.echo",
        name: "Echo Agent",
        description: "Build-safe placeholder agent that echoes input back.",
        enabled: true,
    },
    {
        id: "pulse.router",
        name: "Router Agent",
        description: "Classifies intent and suggests next action (placeholder).",
        enabled: true,
    },
];

export function listAgents(): AgentDefinition[] {
    return registry;
}

/**
 * Creates a run record and executes the agent (placeholder) immediately.
 * Returns both run + result so routes can respond however they like.
 */
export async function startRun(input: AgentRunInput): Promise<{
    run: AgentRunRecord;
    result: AgentRunResult;
}> {
    const agent = registry.find((a) => a.id === input.agent_id);

    const run_id = makeId("run");
    const created = nowIso();

    const run: AgentRunRecord = {
        run_id,
        agent_id: input.agent_id,
        status: "running",
        created_at: created,
        updated_at: created,
        input: input.input,
        context: input.context ?? {},
    };

    RunStore.runs.set(run_id, run);

    pushMessage({
        id: makeId("msg"),
        run_id,
        role: "user",
        content: input.input,
        created_at: nowIso(),
        meta: { event: "startRun" },
    });

    if (!agent) {
        const failed: AgentRunRecord = {
            ...run,
            status: "failed",
            error: `Unknown agent_id: ${input.agent_id}`,
            updated_at: nowIso(),
        };
        RunStore.runs.set(run_id, failed);

        const result: AgentRunResult = {
            ok: false,
            agent_id: input.agent_id,
            output: `Unknown agent_id: ${input.agent_id}`,
            meta: { error: "AGENT_NOT_FOUND", run_id },
        };

        pushMessage({
            id: makeId("msg"),
            run_id,
            role: "system",
            content: result.output,
            created_at: nowIso(),
            meta: { event: "runFailed" },
        });

        return { run: failed, result };
    }

    if (!agent.enabled) {
        const failed: AgentRunRecord = {
            ...run,
            status: "failed",
            error: `Agent disabled: ${input.agent_id}`,
            updated_at: nowIso(),
        };
        RunStore.runs.set(run_id, failed);

        const result: AgentRunResult = {
            ok: false,
            agent_id: input.agent_id,
            output: `Agent disabled: ${input.agent_id}`,
            meta: { error: "AGENT_DISABLED", run_id },
        };

        pushMessage({
            id: makeId("msg"),
            run_id,
            role: "system",
            content: result.output,
            created_at: nowIso(),
            meta: { event: "runFailed" },
        });

        return { run: failed, result };
    }

    // Minimal behaviors to prove pipeline works.
    let output = "";
    let meta: Record<string, any> = { run_id };

    if (agent.id === "pulse.echo") {
        output = input.input;
        meta.kind = "echo";
    } else if (agent.id === "pulse.router") {
        const text = input.input.toLowerCase();
        let intent: string = "unknown";
        if (text.includes("email") || text.includes("reply")) intent = "email";
        else if (text.includes("remind") || text.includes("tomorrow")) intent = "reminder";
        else if (text.includes("call") || text.includes("phone")) intent = "call";
        else if (text.includes("task") || text.includes("todo")) intent = "task";
        output = `Intent: ${intent}. Suggested next step: open the relevant module.`;
        meta.kind = "router";
        meta.intent = intent;
    } else {
        output = `Agent "${agent.name}" ran successfully (placeholder).`;
        meta.kind = "default";
    }

    // Mark complete in store
    await completeRun(run_id, output);

    const result: AgentRunResult = {
        ok: true,
        agent_id: agent.id,
        output,
        meta,
    };

    const finalRun = (await getRun(run_id)) ?? run;

    return { run: finalRun, result };
}

/**
 * Back-compat for earlier patch.
 * If older routes call runAgent(), we still support it.
 */
export async function runAgent(input: AgentRunInput): Promise<AgentRunResult> {
    const { result } = await startRun(input);
    return result;
}
