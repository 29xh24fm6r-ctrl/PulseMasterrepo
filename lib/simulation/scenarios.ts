// Simulation Scenarios
// lib/simulation/scenarios.ts

import { ScenarioConfig, ScenarioKey } from "./types";

export const SCENARIO_TEMPLATES: Record<ScenarioKey, ScenarioConfig> = {
  baseline: {
    key: "baseline",
    name: "Baseline (No Changes)",
    description: "Continue current trajectory with no changes",
    deltas: {},
  },
  high_discipline: {
    key: "high_discipline",
    name: "High Discipline",
    description: "Focus on habits, deep work, and consistency",
    deltas: {
      deep_work_hours_per_day: 2,
      tasks_completed_per_day: 3,
      stress_reduction: -0.2,
      sleep_hours_per_night: 0.5,
    },
  },
  relationship_focused: {
    key: "relationship_focused",
    name: "Relationship Focused",
    description: "Prioritize relationship building and maintenance",
    deltas: {
      relationship_touches_per_day: 2,
      tasks_completed_per_day: -1,
    },
  },
  health_recovery: {
    key: "health_recovery",
    name: "Health Recovery",
    description: "Focus on physical and mental health recovery",
    deltas: {
      exercise_days_per_week: 3,
      sleep_hours_per_night: 1,
      stress_reduction: -0.3,
      deep_work_hours_per_day: -1,
    },
  },
  sales_push: {
    key: "sales_push",
    name: "Sales Push / Deal Sprint",
    description: "Intense focus on closing deals and pipeline",
    deltas: {
      deep_work_hours_per_day: 3,
      relationship_touches_per_day: 1,
      tasks_completed_per_day: 2,
      stress_increase: 0.2,
    },
  },
  sobriety_block: {
    key: "sobriety_block",
    name: "Sobriety Block",
    description: "Complete sobriety focus with recovery support",
    deltas: {
      sobriety_days_per_week: 7,
      stress_reduction: -0.1,
      sleep_hours_per_night: 0.5,
      exercise_days_per_week: 2,
    },
  },
  custom: {
    key: "custom",
    name: "Custom Scenario",
    description: "User-defined scenario",
    deltas: {},
  },
  top_10_percent: {
    key: "top_10_percent",
    name: "Top 10% Performance",
    description: "Simulate what it takes to reach top 10% performance",
    deltas: {
      deep_work_hours_per_day: 2,
      tasks_completed_per_day: 4,
      relationship_touches_per_day: 2,
      stress_reduction: -0.2,
    },
  },
  elite_guild: {
    key: "elite_guild",
    name: "Elite Guild Path",
    description: "Simulate behavior needed to join Elite Closers guild",
    deltas: {
      deep_work_hours_per_day: 3,
      tasks_completed_per_day: 5,
      relationship_touches_per_day: 3,
      stress_reduction: -0.15,
    },
  },
};

export function getScenario(key: ScenarioKey): ScenarioConfig {
  return SCENARIO_TEMPLATES[key] || SCENARIO_TEMPLATES.baseline;
}

