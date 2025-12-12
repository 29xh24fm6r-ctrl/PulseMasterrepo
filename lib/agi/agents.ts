// Agent Interface
// lib/agi/agents.ts

import { AgentContext, AgentResult, AGIAction } from "./types";

export interface Agent {
  name: string;
  description: string;
  priority: number; // higher runs earlier in planning
  run(ctx: AgentContext): Promise<AgentResult>;
}

// Helper to construct a generic result
export function makeAgentResult(
  agentName: string,
  reasoningSummary: string,
  proposedActions: AGIAction[],
  confidence: number
): AgentResult {
  return { agentName, reasoningSummary, proposedActions, confidence };
}



