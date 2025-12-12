// Multi-Timeline Simulation v2 Types
// lib/simulation/v2/types.ts

export interface SimulationRunInputContext {
  seedDate: string; // 'YYYY-MM-DD'
  horizonDays: number;
  // Snapshots from other systems:
  goals?: any;
  habits?: any;
  somaticPatterns?: any;
  somaticToday?: any;
  socialGraph?: any;
  narrativeContext?: any;
  valueProfile?: any;
  wisdomSummary?: any;
}

export interface SimulationPolicy {
  key: string;
  name: string;
  description?: string;
  domain?: string;
  policySpec: any; // intensity knobs, constraints, etc.
}

export interface SimulationTimelineBlueprint {
  policyKey: string;
  label: string;
  narrativeLabel?: string;
  scoreOverall: number;
  scoreWork?: number;
  scoreHealth?: number;
  scoreRelationships?: number;
  scoreFinance?: number;
  scoreSelfRespect?: number;
  scoreAlignment?: number;
  scoreBurnoutRisk?: number;
  summary?: string;
  steps: Array<{
    stepIndex: number;
    horizonLabel: string;
    metrics: any;
    events: any;
    narrativeSnippet?: string;
  }>;
}

export interface SimulationOutcomeSummary {
  comparisonSummary: string;
  bestTimelines: any[];
  worstTimelines: any[];
  keyTradeoffs: any;
}
