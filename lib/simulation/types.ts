// Simulation Types
// lib/simulation/types.ts

export type ScenarioKey =
  | "baseline"
  | "high_discipline"
  | "relationship_focused"
  | "health_recovery"
  | "sales_push"
  | "sobriety_block"
  | "custom"
  | "top_10_percent"
  | "elite_guild";

export interface ScenarioConfig {
  key: ScenarioKey;
  name: string;
  description: string;
  deltas: {
    deep_work_hours_per_day?: number; // e.g., +2
    tasks_completed_per_day?: number;
    relationship_touches_per_day?: number;
    sobriety_days_per_week?: number; // 0-7
    exercise_days_per_week?: number;
    sleep_hours_per_night?: number;
    stress_reduction?: number; // -0.1 to -0.3
    [key: string]: any;
  };
}

export interface SimulationResult {
  scenario: ScenarioConfig;
  horizonDays: number;
  baselineMetrics: Record<string, number>;
  dailyProjections: Array<{
    day: number;
    date: string;
    metrics: Record<string, number>;
  }>;
  summary: {
    narrative: string;
    pros: string[];
    cons: string[];
    risks: string[];
  };
}

