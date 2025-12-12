// Simulation API Helpers
// lib/simulation/api.ts

import { runSimulationScenario, getPredefinedScenarios } from "./run";
import { SimulationInput } from "./scenario";

/**
 * Helper to run a quick simulation for decision-making
 */
export async function runQuickSimulation(
  userId: string,
  scenarioName: string,
  days: number = 90
): Promise<any> {
  const scenarios = getPredefinedScenarios();
  const scenario = scenarios.find((s) => s.name === scenarioName);

  if (scenario) {
    const input: SimulationInput = {
      ...scenario.input,
      days,
    };
    return await runSimulationScenario(userId, scenarioName, input);
  }

  // Default: maintain current
  return await runSimulationScenario(userId, "maintain_current", {
    days,
    adjustments: {},
  });
}




