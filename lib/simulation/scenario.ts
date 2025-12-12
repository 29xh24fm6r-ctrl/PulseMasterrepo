// Scenario Simulation Engine
// lib/simulation/scenario.ts

import { DigitalTwinState, updateTwinState } from "./twin";

export interface SimulationInput {
  days: number;                         // e.g. 30, 60, 90
  adjustments?: {
    increase_healing?: number;          // 0–100
    increase_career?: number;
    reduce_stressors?: number;
    improve_habits?: number;
    reduce_drinking?: boolean;
    double_down_on_performance?: boolean;
  };
}

export interface SimulationStep {
  day: number;
  state: DigitalTwinState;
}

/**
 * Run simulation scenario
 */
export function runSimulation(
  initialTwin: DigitalTwinState,
  input: SimulationInput
): SimulationStep[] {
  const steps: SimulationStep[] = [];
  let currentState = { ...initialTwin };

  for (let day = 1; day <= input.days; day++) {
    // Apply adjustments
    const adjustments = input.adjustments || {};

    // Healing focus
    if (adjustments.increase_healing) {
      currentState = updateTwinState(currentState, {
        stress: currentState.stress - (adjustments.increase_healing * 0.4),
        emotional_resilience: currentState.emotional_resilience + (adjustments.increase_healing * 0.3),
        arc_momentum: {
          ...currentState.arc_momentum,
          healing: currentState.arc_momentum.healing + (adjustments.increase_healing * 0.8),
        },
        risk: {
          ...currentState.risk,
          burnout: currentState.risk.burnout - (adjustments.increase_healing * 0.2),
        },
      });
    }

    // Career focus
    if (adjustments.increase_career) {
      currentState = updateTwinState(currentState, {
        career_velocity: currentState.career_velocity + (adjustments.increase_career * 0.6),
        stress: currentState.stress + (adjustments.increase_career * 0.3),
        arc_momentum: {
          ...currentState.arc_momentum,
          career: currentState.arc_momentum.career + (adjustments.increase_career * 0.7),
        },
        risk: {
          ...currentState.risk,
          burnout: currentState.risk.burnout + (adjustments.increase_career * 0.2),
        },
      });
    }

    // Performance push
    if (adjustments.double_down_on_performance) {
      currentState = updateTwinState(currentState, {
        focus_capacity: currentState.focus_capacity + 6,
        stress: currentState.stress + 5,
        career_velocity: currentState.career_velocity + 7,
        sales_pipeline_health: currentState.sales_pipeline_health + 8,
        arc_momentum: {
          ...currentState.arc_momentum,
          performance: currentState.arc_momentum.performance + 10,
        },
        risk: {
          ...currentState.risk,
          burnout: currentState.risk.burnout + 3,
        },
      });
    }

    // Reduce stressors
    if (adjustments.reduce_stressors) {
      currentState = updateTwinState(currentState, {
        stress: currentState.stress - (adjustments.reduce_stressors * 0.5),
        energy: currentState.energy + (adjustments.reduce_stressors * 0.3),
        risk: {
          ...currentState.risk,
          burnout: currentState.risk.burnout - (adjustments.reduce_stressors * 0.3),
        },
      });
    }

    // Improve habits
    if (adjustments.improve_habits) {
      currentState = updateTwinState(currentState, {
        habit_consistency: currentState.habit_consistency + (adjustments.improve_habits * 0.5),
        sleep_quality: currentState.sleep_quality + (adjustments.improve_habits * 0.4),
        energy: currentState.energy + (adjustments.improve_habits * 0.2),
        emotional_resilience: currentState.emotional_resilience + (adjustments.improve_habits * 0.3),
      });
    }

    // Reduce drinking
    if (adjustments.reduce_drinking) {
      currentState = updateTwinState(currentState, {
        sleep_quality: currentState.sleep_quality + 15,
        energy: currentState.energy + 10,
        emotional_resilience: currentState.emotional_resilience + 8,
        risk: {
          ...currentState.risk,
          relapse: currentState.risk.relapse - 20,
        },
      });
    }

    // Natural decay/regeneration (daily cycles)
    // Energy regenerates if stress is low
    if (currentState.stress < 50) {
      currentState = updateTwinState(currentState, {
        energy: currentState.energy + 1,
      });
    } else {
      currentState = updateTwinState(currentState, {
        energy: currentState.energy - 0.5,
      });
    }

    // Stress naturally decreases if no stressors
    if (!adjustments.double_down_on_performance && !adjustments.increase_career) {
      currentState = updateTwinState(currentState, {
        stress: currentState.stress - 0.3,
      });
    }

    // Mood drifts toward neutral
    if (currentState.mood > 0) {
      currentState = updateTwinState(currentState, {
        mood: currentState.mood - 0.2,
      });
    } else if (currentState.mood < 0) {
      currentState = updateTwinState(currentState, {
        mood: currentState.mood + 0.2,
      });
    }

    // Risk accumulation
    if (currentState.stress > 70) {
      currentState = updateTwinState(currentState, {
        risk: {
          ...currentState.risk,
          burnout: currentState.risk.burnout + 0.5,
        },
      });
    }

    // Save step
    steps.push({
      day,
      state: { ...currentState },
    });
  }

  return steps;
}




