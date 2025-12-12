// Agent Registry
// lib/agi/registry.ts

import { Agent } from "./agents";
import { butlerAgent } from "./agents/butlerAgent";
import { relationshipAgent } from "./agents/relationshipAgent";
import { workAgent } from "./agents/workAgent";
import { financeAgent } from "./agents/financeAgent";
import { simulationAgent } from "./agents/simulationAgent";
import { identityAgent } from "./agents/identityAgent";
import { emotionAgent } from "./agents/emotionAgent";
import { executiveFunctionAgent } from "./agents/executiveFunctionAgent";
import { goalsAgent } from "./agents/goalsAgent";
import { memoryCoachAgent } from "./agents/memoryCoachAgent";

export function getRegisteredAgents(): Agent[] {
  return [
    identityAgent, // 90
    executiveFunctionAgent, // 85
    emotionAgent, // 85
    goalsAgent, // 80
    memoryCoachAgent, // 80
    butlerAgent, // 80
    workAgent, // 75
    relationshipAgent, // 70
    financeAgent, // 60
    simulationAgent, // 50
  ].sort((a, b) => b.priority - a.priority);
}

