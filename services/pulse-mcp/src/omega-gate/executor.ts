// omega-gate/executor.ts
// Tool execution dispatcher — routes gate calls to implementations.
// Phase 1: read tools call existing pulse_read functions.
// Phase 2: simulate/propose/execute call Temporal workflows.

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

export interface ExecutionResult {
  summary: string;
  artifacts: unknown[];
}

/**
 * Execute a gate tool call.
 * Only runs for tools that passed allowlist + confidence checks.
 */
export async function executeGateTool(request: GateRequest): Promise<ExecutionResult> {
  const entry = getToolEntry(request.tool);
  if (!entry) {
    return { summary: "Tool not found", artifacts: [] };
  }

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

    default:
      return { summary: `No executor for tool: ${request.tool}`, artifacts: [] };
  }
}
