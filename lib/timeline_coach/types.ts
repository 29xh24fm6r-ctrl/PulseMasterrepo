// Timeline Coach v1 Types
// lib/timeline_coach/types.ts

export interface TimelinePreferenceProfile {
  userId: string;
  domainWeights: Record<string, number>;
  riskTolerance: Record<string, number>;
  timePreferences: Record<string, number>;
  comfortZones: any;
  sacrificePreferences: any;
  summary?: string;
}

export interface TimelineChoiceContext {
  run: any;                  // simulation_runs row
  timelines: any[];          // simulation_timelines rows
  outcome: any | null;       // simulation_outcomes row
  preferenceProfile: TimelinePreferenceProfile | null;
  valueProfile: any | null;
  narrativeContext: any | null;
}

export interface TimelineDecisionBlueprint {
  runId: string;
  chosenTimelineId: string;
  horizonDays: number;
  label: string;
  rationale: string;
  perceivedBenefits: any;
  perceivedCosts: any;
  confidence: number;
  seasonStart: string;       // 'YYYY-MM-DD'
  seasonEnd: string;         // 'YYYY-MM-DD'
  commitments: Array<{
    kind: string;
    label: string;
    description?: string;
    config: any;
    domain?: string;
  }>;
}


