// lib/langgraph/nodes/execute.ts
// Executor node: Execute approved drafts

import type { OmegaState, ReasoningStep } from "../types";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function executeNode(state: OmegaState): Promise<Partial<OmegaState>> {
  const startTime = Date.now();

  if (!state.draft || !state.approved) {
    return { errors: ["Cannot execute: not approved"] };
  }

  try {
    if (state.draft.id) {
      await supabaseAdmin
        .from("pulse_drafts")
        .update({
          status: "auto_executed",
          executed_at: new Date().toISOString()
        })
        .eq("id", state.draft.id);
    }

    const executionResult: Record<string, any> = {
      action: `${state.draft.draftType}_executed`,
      status: "completed",
      executedAt: new Date().toISOString()
    };

    const step: ReasoningStep = {
      node: "executor",
      input: { draftType: state.draft.draftType },
      output: executionResult,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    return {
      executionResult,
      reasoningTrace: [step]
    };
  } catch (error) {
    return {
      errors: [`Execution error: ${error}`],
      reasoningTrace: [{
        node: "executor",
        input: { draft: state.draft?.title },
        output: { error: String(error) },
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }]
    };
  }
}
