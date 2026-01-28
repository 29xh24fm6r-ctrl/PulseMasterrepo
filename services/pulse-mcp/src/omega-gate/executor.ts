// omega-gate/executor.ts
// Tool execution dispatcher — routes gate calls to implementations.
// Every tool execution is logged to pulse_observer_events (structured, non-blocking).
// Canon: never throw on infra errors, no retries inside handlers.

import type { GateRequest } from "./validation.js";
import { getToolEntry } from "./allowlist.js";
import {
  listSignals,
  listDrafts,
  listOutcomes,
  listReviewRequests,
  listExecutionLog,
  listObserverEvents,
  listConfidenceEvents,
  // Phase 2: Memory
  listMemoryEvents,
  listRecentMemory,
  searchMemory,
  // Phase 5: Decisions
  listDecisions,
  listRecentDecisions,
  // Phase 6: Trust
  getTrustState,
  // Phase 4: Triggers
  listTriggerCandidates,
  // Phase 7: Context
  getCurrentContext,
} from "../tools/pulse_read.js";
import {
  addMemoryEvent,
  recordDecision,
  upsertTrigger,
  setTrustState,
} from "../tools/pulse_write.js";
import { systemSchemaHealth } from "../tools/system_schema_health.js";
import { systemSmokeTest } from "../tools/system_smoke_test.js";
import { proposeScreen } from "../tools/design_propose_screen.js";
import { refineScreen } from "../tools/design_refine_screen.js";
import { designHistory } from "../tools/design_history.js";
import { checkEvolution } from "../tools/design_evolution.js";
import { checkCoherence } from "../tools/design_coherence.js";
import { personaShape } from "../tools/persona_shape.js";
import { personaCalibrate } from "../tools/persona_calibrate.js";
import { getSupabase } from "../supabase.js";
import { checkRateLimit } from "../rate-limit.js";

export interface ExecutionResult {
  summary: string;
  artifacts: unknown[];
}

/**
 * Log tool execution to pulse_observer_events.
 * Non-blocking: errors are swallowed (never fail the tool call).
 */
async function logToolExecution(
  tool: string,
  userId: string | undefined,
  status: "ok" | "error",
  durationMs: number,
): Promise<void> {
  if (!userId) return;
  try {
    await getSupabase().from("pulse_observer_events").insert({
      user_id: userId,
      event_type: "mcp_tool_call",
      payload: {
        tool,
        status,
        durationMs,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });
  } catch {
    // Never fail the response if logging fails
  }
}

/**
 * Execute a gate tool call.
 * Only runs for tools that passed allowlist + confidence checks.
 * Every call is logged to pulse_observer_events.
 * Rate limited per user (degrades gracefully).
 */
export async function executeGateTool(request: GateRequest): Promise<ExecutionResult> {
  const entry = getToolEntry(request.tool);
  if (!entry) {
    return { summary: "Tool not found", artifacts: [] };
  }

  // Rate limit check (per user, degrades gracefully)
  const userId = (request.inputs as Record<string, unknown>)?.target_user_id as string | undefined;
  if (userId) {
    const rateCheck = checkRateLimit(userId);
    if (!rateCheck.ok) {
      return {
        summary: "Rate limit exceeded",
        artifacts: [{ rate_limited: true, remaining: 0, limit: rateCheck.limit }],
      };
    }
  }

  const startMs = Date.now();
  let result: ExecutionResult;

  try {
    result = await executeToolSwitch(request);
  } catch (e: any) {
    result = {
      summary: `Tool error: ${e?.message ?? "Unknown error"}`,
      artifacts: [{ error: true, message: e?.message }],
    };
  }

  // Log execution (non-blocking, never fails the call)
  const durationMs = Date.now() - startMs;
  const status = result.summary.includes("error") || result.summary.includes("Error") ? "error" : "ok";
  logToolExecution(request.tool, userId, status, durationMs).catch(() => {});

  return result;
}

/**
 * Internal dispatch — pure tool routing, no logging/rate-limiting.
 */
async function executeToolSwitch(request: GateRequest): Promise<ExecutionResult> {
  switch (request.tool) {
    // ============================================
    // DIAGNOSTIC TOOLS
    // ============================================
    case "mcp.tick": {
      return {
        summary: "Omega Gate round-trip OK",
        artifacts: [{
          ok: true,
          service: "pulse-mcp",
          call_id: request.call_id,
          echo: request.inputs ?? {},
          server_time: new Date().toISOString(),
        }],
      };
    }

    // ============================================
    // READ TOOLS
    // ============================================
    case "observer.query": {
      const data = await listObserverEvents(request.inputs);
      return {
        summary: `Retrieved ${data.length} observer events`,
        artifacts: data,
      };
    }

    case "state.inspect": {
      // Return a composite state snapshot
      const targetUserId = (request.inputs as any).target_user_id;
      if (!targetUserId) {
        return { summary: "Missing target_user_id", artifacts: [] };
      }
      const input = { target_user_id: targetUserId, limit: 10 };
      const [signals, drafts, outcomes] = await Promise.all([
        listSignals(input).catch(() => []),
        listDrafts(input).catch(() => []),
        listOutcomes(input).catch(() => []),
      ]);
      return {
        summary: `State snapshot: ${signals.length} signals, ${drafts.length} drafts, ${outcomes.length} outcomes`,
        artifacts: [{ signals, drafts, outcomes }],
      };
    }

    case "state.signals": {
      const data = await listSignals(request.inputs);
      return { summary: `Retrieved ${data.length} signals`, artifacts: data };
    }

    case "state.drafts": {
      const data = await listDrafts(request.inputs);
      return { summary: `Retrieved ${data.length} drafts`, artifacts: data };
    }

    case "state.outcomes": {
      const data = await listOutcomes(request.inputs);
      return { summary: `Retrieved ${data.length} outcomes`, artifacts: data };
    }

    case "state.confidence": {
      const data = await listConfidenceEvents(request.inputs);
      return { summary: `Retrieved ${data.length} confidence events`, artifacts: data };
    }

    // ============================================
    // SIMULATION TOOLS (Phase 1: stub)
    // ============================================
    case "plan.simulate": {
      return {
        summary: "Simulation stub: would evaluate plan without side effects",
        artifacts: [{ simulated: true, intent: request.intent, inputs: request.inputs }],
      };
    }

    // ============================================
    // PROPOSAL TOOLS
    // ============================================
    case "plan.propose": {
      return {
        summary: `Plan proposal: ${request.intent}`,
        artifacts: [{
          proposal_type: "plan",
          intent: request.intent,
          inputs: request.inputs,
          summary: request.intent,
        }],
      };
    }

    case "plan.propose_patch": {
      const patchInputs = request.inputs as Record<string, unknown>;
      return {
        summary: `Plan patch proposal: ${request.intent}`,
        artifacts: [{
          proposal_type: "plan_patch",
          target: patchInputs.target ?? null,
          patch: patchInputs.patch ?? patchInputs,
          intent: request.intent,
          summary: (patchInputs.summary as string) ?? request.intent,
        }],
      };
    }

    case "state.propose_patch": {
      const stateInputs = request.inputs as Record<string, unknown>;
      return {
        summary: `State patch proposal: ${request.intent}`,
        artifacts: [{
          proposal_type: "state_patch",
          target: stateInputs.target ?? null,
          patch: stateInputs.patch ?? stateInputs,
          intent: request.intent,
          summary: (stateInputs.summary as string) ?? request.intent,
        }],
      };
    }

    case "action.propose": {
      const actionInputs = request.inputs as Record<string, unknown>;
      return {
        summary: `Action proposal: ${request.intent}`,
        artifacts: [{
          proposal_type: "action",
          action_type: actionInputs.action_type ?? "unknown",
          params: actionInputs.params ?? actionInputs,
          intent: request.intent,
          summary: (actionInputs.summary as string) ?? request.intent,
        }],
      };
    }

    // ============================================
    // EXECUTION TOOLS (Phase 1: stub)
    // ============================================
    case "action.execute": {
      return {
        summary: "Execution stub: would execute approved action via Temporal",
        artifacts: [{ executed: false, stub: true, intent: request.intent }],
      };
    }

    // ============================================
    // PHASE 2: MEMORY TOOLS (READ-ONLY)
    // ============================================
    case "memory.list": {
      const data = await listMemoryEvents(request.inputs);
      return { summary: `Retrieved ${data.length} memory events`, artifacts: data };
    }

    case "memory.recent": {
      const data = await listRecentMemory(request.inputs);
      return { summary: `Retrieved ${data.length} recent memories`, artifacts: data };
    }

    case "memory.search": {
      const data = await searchMemory(request.inputs);
      return { summary: `Found ${data.length} matching memories`, artifacts: data };
    }

    // ============================================
    // PHASE 5: DECISION TOOLS (READ-ONLY)
    // ============================================
    case "decision.list": {
      const data = await listDecisions(request.inputs);
      return { summary: `Retrieved ${data.length} decisions`, artifacts: data };
    }

    case "decision.recent": {
      const data = await listRecentDecisions(request.inputs);
      return { summary: `Retrieved ${data.length} recent decisions`, artifacts: data };
    }

    // ============================================
    // PHASE 6: TRUST STATE (READ-ONLY)
    // ============================================
    case "trust.state": {
      const data = await getTrustState(request.inputs);
      return {
        summary: `Trust state: autonomy level ${(data as any).autonomy_level}`,
        artifacts: [data],
      };
    }

    // ============================================
    // PHASE 4: TRIGGER CANDIDATES (READ-ONLY)
    // ============================================
    case "triggers.list": {
      const data = await listTriggerCandidates(request.inputs);
      return { summary: `Retrieved ${data.length} trigger candidates`, artifacts: data };
    }

    // ============================================
    // PHASE 7: CONTEXT SNAPSHOT (READ-ONLY)
    // ============================================
    case "context.current": {
      const data = await getCurrentContext(request.inputs);
      return {
        summary: `Context snapshot for user ${(data as any).user_id}`,
        artifacts: [data],
      };
    }

    // ============================================
    // WRITE PRIMITIVES
    // ============================================
    case "memory.add": {
      const res = await addMemoryEvent(request.inputs);
      return res.ok
        ? { summary: `Memory added (${res.id})`, artifacts: [res] }
        : { summary: `Memory add error: ${res.error}`, artifacts: [res] };
    }

    case "decision.record": {
      const res = await recordDecision(request.inputs);
      return res.ok
        ? { summary: `Decision recorded (${res.id})`, artifacts: [res] }
        : { summary: `Decision record error: ${res.error}`, artifacts: [res] };
    }

    case "trigger.upsert": {
      const res = await upsertTrigger(request.inputs);
      return res.ok
        ? { summary: `Trigger upserted (${res.id})`, artifacts: [res] }
        : { summary: `Trigger upsert error: ${res.error}`, artifacts: [res] };
    }

    case "trust.state_set": {
      const res = await setTrustState(request.inputs);
      return res.ok
        ? { summary: "Trust state updated", artifacts: [res] }
        : { summary: `Trust state error: ${res.error}`, artifacts: [res] };
    }

    // ============================================
    // SYSTEM DIAGNOSTICS
    // ============================================
    case "system.schema_health": {
      const data = await systemSchemaHealth();
      return {
        summary: data.summary,
        artifacts: [data],
      };
    }

    case "system.smoke_test": {
      const data = await systemSmokeTest(request.inputs);
      return {
        summary: data.summary,
        artifacts: [data],
      };
    }

    // ============================================
    // DESIGN INTELLIGENCE
    // ============================================
    case "design.propose_screen": {
      const res = await proposeScreen(request.inputs);
      if (!res.ok) {
        return {
          summary: `Design proposal error: ${res.error}`,
          artifacts: [res],
        };
      }
      if (res.absence) {
        return {
          summary: `Designed absence: ${res.absence.reason} (${res.proposal_id})`,
          artifacts: [res],
        };
      }
      return {
        summary: `Design proposal created: ${res.proposal?.screen_name ?? "screen"} [${res.proposal?.screen_modes?.default ?? "scan"}] (${res.proposal_id})`,
        artifacts: [res],
      };
    }

    case "design.refine_screen": {
      const res = await refineScreen(request.inputs);
      if (!res.ok) {
        return {
          summary: `Refinement error: ${res.error}`,
          artifacts: [res],
        };
      }
      if (!res.proposal_id) {
        // Explanation or clarifying question (no new proposal created)
        return {
          summary: `Design feedback: ${res.refinement_type ?? "clarification"} (${res.parent_proposal_id})`,
          artifacts: [res],
        };
      }
      return {
        summary: `Refined proposal v${res.version}: ${res.refinement_type} (${res.proposal_id})`,
        artifacts: [res],
      };
    }

    case "design.history": {
      const res = await designHistory(request.inputs);
      if (!res.ok) {
        return {
          summary: `History error: ${res.error}`,
          artifacts: [res],
        };
      }
      return {
        summary: `History: ${res.versions?.length ?? 0} version(s)${res.diff ? `, diff: +${res.diff.added.length}/-${res.diff.removed.length}/~${res.diff.changed.length}` : ""}`,
        artifacts: [res],
      };
    }

    case "design.check_evolution": {
      const res = await checkEvolution(request.inputs);
      if (!res.ok) {
        return {
          summary: `Evolution check error: ${res.error}`,
          artifacts: [res],
        };
      }
      return {
        summary: `Evolution: ${res.suggestions?.length ?? 0} suggestion(s)`,
        artifacts: [res],
      };
    }

    case "design.check_coherence": {
      const res = await checkCoherence(request.inputs);
      if (!res.ok) {
        return {
          summary: `Coherence check error: ${res.error}`,
          artifacts: [res],
        };
      }
      return {
        summary: `Coherence: ${res.issues?.length ?? 0} issue(s)`,
        artifacts: [res],
      };
    }

    // ============================================
    // CONVERSATIONAL PERSONHOOD
    // ============================================
    case "persona.shape": {
      const res = await personaShape(request.inputs);
      return res.ok
        ? {
            summary: `Shaped (${res.posture}, L${res.familiarity_level})`,
            artifacts: [res],
          }
        : {
            summary: `Shape error: ${res.error}`,
            artifacts: [res],
          };
    }

    case "persona.calibrate": {
      const res = await personaCalibrate(request.inputs);
      return res.ok
        ? {
            summary: `Calibrated: ${res.preferences_updated.join(", ") || "recorded"}`,
            artifacts: [res],
          }
        : {
            summary: `Calibrate error: ${res.error}`,
            artifacts: [res],
          };
    }

    default:
      return { summary: `No executor for tool: ${request.tool}`, artifacts: [] };
  }
}
