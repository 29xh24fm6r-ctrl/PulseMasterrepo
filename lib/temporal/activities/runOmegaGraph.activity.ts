// lib/temporal/activities/runOmegaGraph.activity.ts
// Activity that runs the LangGraph cognition engine

import type { OmegaState } from "@/lib/langgraph/types";
import { processSignalWithOmega } from "@/lib/langgraph";

export interface RunOmegaInput {
  signal: OmegaState["signal"];
  userId: string;
  userContext: Record<string, unknown>;
}

/**
 * Run the Omega LangGraph cognition engine
 * This is the main "thinking" activity - it:
 * - Observes the signal
 * - Predicts user intent
 * - Generates a draft
 * - Optionally runs diagnosis/simulation/evolution
 * - Runs Guardian + HardGuard safety checks
 * - Returns final state with approval decision
 */
export async function runOmegaGraphActivity(input: RunOmegaInput): Promise<OmegaState> {
  const { signal, userId, userContext } = input;
  return await processSignalWithOmega(signal, userId, userContext);
}
