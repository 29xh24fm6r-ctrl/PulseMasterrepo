// Simulation Agent - Life simulation and scenario analysis
// lib/agi/agents/simulationAgent.ts

import { Agent, makeAgentResult } from "../agents";
import { AgentContext, AGIAction } from "../types";

export const simulationAgent: Agent = {
  name: "SimulationAgent",
  description: "Triggers Life Simulation Engine for 'what if' scenarios and trajectory analysis.",
  priority: 50,

  async run(ctx: AgentContext) {
    const actions: AGIAction[] = [];
    const { world } = ctx;

    // Trigger simulation if there are major changes or decisions pending
    const hasMajorChanges =
      (world.time.overdueTasks?.length ?? 0) > 5 ||
      (world.work.activeDeals?.length ?? 0) > 10 ||
      (world.relationships.atRiskRelationships?.length ?? 0) > 3;

    if (hasMajorChanges) {
      actions.push({
        type: "schedule_simulation",
        label: "Run life trajectory simulation",
        details: {
          horizonDays: 90,
          scenarios: ["current_path", "optimized_path", "risk_mitigation"],
        },
        requiresConfirmation: false,
        riskLevel: "low",
      });
    }

    const reasoning = hasMajorChanges
      ? "Major changes detected - simulation recommended to understand trajectory."
      : "No major changes requiring simulation.";

    const confidence = hasMajorChanges ? 0.7 : 0.3;

    return makeAgentResult("SimulationAgent", reasoning, actions, confidence);
  },
};



