// Scenario Simulation Tests
// tests/simulation/scenario.test.ts

import { runSimulation } from "@/lib/simulation/scenario";
import { createDefaultTwin } from "@/lib/simulation/twin";

describe("Scenario Simulation", () => {
  test("adjustments apply predictable modifications", () => {
    const initialTwin = createDefaultTwin();
    const steps = runSimulation(initialTwin, {
      days: 30,
      adjustments: {
        increase_healing: 80,
      },
    });

    expect(steps.length).toBe(30);
    const finalState = steps[steps.length - 1].state;
    
    // Healing should increase
    expect(finalState.arc_momentum.healing).toBeGreaterThan(initialTwin.arc_momentum.healing);
    // Stress should decrease
    expect(finalState.stress).toBeLessThan(initialTwin.stress);
  });

  test("performance push increases stress and burnout risk", () => {
    const initialTwin = createDefaultTwin();
    const steps = runSimulation(initialTwin, {
      days: 30,
      adjustments: {
        double_down_on_performance: true,
      },
    });

    const finalState = steps[steps.length - 1].state;
    expect(finalState.stress).toBeGreaterThan(initialTwin.stress);
    expect(finalState.risk.burnout).toBeGreaterThan(initialTwin.risk.burnout);
  });
});




