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
    // PROPOSAL TOOLS (Phase 1: stub)
    // ============================================
    case "plan.propose": {
      return {
        summary: "Proposal stub: would create draft for human review",
        artifacts: [{ proposed: true, intent: request.intent, inputs: request.inputs }],
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

    default:
      return { summary: `No executor for tool: ${request.tool}`, artifacts: [] };
  }
}
