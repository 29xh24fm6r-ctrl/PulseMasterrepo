// lib/langgraph/omega-graph.ts
// Main Omega Prime orchestration graph using LangGraph

import { StateGraph, END } from "@langchain/langgraph";
import type { OmegaState } from "./types";
import { OmegaStateAnnotation } from "./types";
import { observeNode } from "./nodes/observe";
import { predictIntentNode } from "./nodes/predict-intent";
import { generateDraftNode } from "./nodes/generate-draft";
import { diagnoseNode } from "./nodes/diagnose";
import { simulateNode } from "./nodes/simulate";
import { evolveNode } from "./nodes/evolve";
import { guardianNode } from "./nodes/guardian";
import { executeNode } from "./nodes/execute";
import { queueForReviewNode } from "./nodes/queue-for-review";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Conditional: route after draft generation
// Deterministic routing based on state, not randomness
function shouldRunOmegaAnalysis(state: typeof OmegaStateAnnotation.State): string {
  const hasEnoughTraces = state.reasoningTrace.length >= 3;
  const hasIssues = state.errors.length > 0 || (state.draft?.confidence || 0) < 0.7;

  // Deterministic exploration: enable via user preference or low confidence
  const explorationEnabled = state.userContext?.preferences?.enableExploration === true;
  // Use sessionId for deterministic "random" exploration (same session = same route)
  const deterministicExplore = explorationEnabled && state.sessionId.endsWith("a");

  if (hasEnoughTraces && (hasIssues || deterministicExplore)) {
    return "diagnose";
  }
  return "guardian";
}

// Conditional: route after guardian
function routeAfterGuardian(state: typeof OmegaStateAnnotation.State): string {
  if (!state.approved) {
    return "queue_for_review";
  }
  if (state.shouldAutoExecute) {
    return "execute";
  }
  return "queue_for_review";
}

// Persist final state to database - ALWAYS writes a trace row, never throws
async function persistState(state: OmegaState): Promise<void> {
  try {
    // Always write a trace row, even if reasoningTrace is empty (on failures)
    await supabaseAdmin.from("pulse_reasoning_traces").insert({
      user_id: state.userId,
      session_id: state.sessionId,
      trace_type: "langgraph_omega_loop",
      input_context: { signal: state.signal },
      reasoning_steps: state.reasoningTrace || [],
      output: {
        intent: state.intent,
        draft: state.draft,
        approved: state.approved,
        autoExecuted: state.shouldAutoExecute,
        errors: state.errors,
      },
      duration_ms: (state.reasoningTrace || []).reduce((sum, s) => sum + s.durationMs, 0),
      success: (state.errors || []).length === 0,
    });

    // Persist cognitive limits (if any)
    for (const limit of state.cognitiveIssues || []) {
      try {
        await supabaseAdmin.from("pulse_cognitive_limits").insert({
          user_id: state.userId,
          limit_type: limit.type,
          description: limit.description,
          evidence: { reasoning: limit.evidence },
          severity: limit.severity,
        });
      } catch (limitErr) {
        console.error("[Omega] Failed to persist cognitive limit:", limitErr);
      }
    }

    // Persist improvements (if any)
    for (const improvement of state.proposedImprovements || []) {
      try {
        await supabaseAdmin.from("pulse_improvements").insert({
          user_id: state.userId,
          improvement_type: improvement.type,
          target_component: improvement.target,
          current_state: improvement.currentState,
          proposed_change: improvement.proposedChange,
          expected_impact: improvement.expectedImpact,
          status: "proposed",
        });
      } catch (impErr) {
        console.error("[Omega] Failed to persist improvement:", impErr);
      }
    }
  } catch (error) {
    // Never throw - log and continue
    console.error("[Omega] Failed to persist Omega state:", error);
  }
}

// Build the compiled graph
export function buildOmegaGraph() {
  const workflow = new StateGraph(OmegaStateAnnotation);

  // Add nodes
  workflow.addNode("observe", observeNode);
  workflow.addNode("predict_intent", predictIntentNode);
  workflow.addNode("generate_draft", generateDraftNode);
  workflow.addNode("diagnose", diagnoseNode);
  workflow.addNode("simulate", simulateNode);
  workflow.addNode("evolve", evolveNode);
  workflow.addNode("guardian", guardianNode);
  workflow.addNode("execute", executeNode);
  workflow.addNode("queue_for_review", queueForReviewNode);

  // Entry point
  workflow.setEntryPoint("observe");

  // Linear flow: observe -> predict -> generate
  workflow.addEdge("observe", "predict_intent");
  workflow.addEdge("predict_intent", "generate_draft");

  // Conditional: after draft, maybe run Omega analysis
  workflow.addConditionalEdges("generate_draft", shouldRunOmegaAnalysis, {
    diagnose: "diagnose",
    guardian: "guardian",
  });

  // Omega analysis chain
  workflow.addEdge("diagnose", "simulate");
  workflow.addEdge("simulate", "evolve");
  workflow.addEdge("evolve", "guardian");

  // Guardian decides final path
  workflow.addConditionalEdges("guardian", routeAfterGuardian, {
    execute: "execute",
    queue_for_review: "queue_for_review",
  });

  // End states
  workflow.addEdge("execute", END);
  workflow.addEdge("queue_for_review", END);

  return workflow.compile();
}

// Main entry point
export async function processSignalWithOmega(
  signal: OmegaState["signal"],
  userId: string,
  userContext: Record<string, any> = {}
): Promise<OmegaState> {
  const graph = buildOmegaGraph();

  const initialState = {
    userId,
    sessionId: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    signal,
    userContext,
    observations: [],
    intent: null,
    draft: null,
    cognitiveIssues: [],
    simulations: [],
    proposedImprovements: [],
    guardianReview: null,
    approved: false,
    shouldAutoExecute: false,
    executionResult: null,
    reasoningTrace: [],
    errors: [],
    messages: [],
  };

  let finalState: OmegaState;

  try {
    finalState = (await graph.invoke(initialState)) as OmegaState;
  } catch (err) {
    // Ensure we persist failures too - create error state from initial
    console.error("[Omega] Graph invoke error:", err);
    finalState = {
      ...initialState,
      errors: [...(initialState.errors || []), `Graph invoke error: ${String(err)}`],
    } as OmegaState;
  }

  // Always persist, regardless of success or failure
  await persistState(finalState);

  return finalState;
}
