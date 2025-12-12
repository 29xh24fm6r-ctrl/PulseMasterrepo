// Strategic Mind v1 Types
// lib/strategic_mind/v1/types.ts

export type StrategicTimescale =
  | 'lifetime'
  | 'five_year'
  | 'year'
  | 'quarter'
  | 'month'
  | 'week'
  | 'day';

export interface StrategicSignalBundle {
  now: string;
  goals: any[];                 // from goal_hierarchy
  destiny: any | null;          // destiny snapshots
  timeline: any | null;         // timeline contexts
  narrative: any | null;        // life chapter
  identity: any | null;         // identity engine
  emotion: any | null;          // emotional state
  somatic: any | null;          // energy / fatigue
  relationships: any[];         // relational snapshots
  culture: any[];               // ethnographic profiles
  brainHealth: any | null;      // diagnostics
  forecast: any | null;         // from AGI kernel / forecasting
  presencePrefs: any | null;    // presence + brain prefs
  hypotheses: any[];            // cognitive_hypotheses
  insights: any[];              // cognitive_insights
  archetypeSnapshot: any | null; // archetype_snapshots
}

export interface StrategicConflict {
  conflictType: string;
  description: string;
  severity: number;
  timescale?: StrategicTimescale | string;
  involvedGoals?: any[];
  subsystemInputs?: any;
  recommendedResolutions?: any[];
}

export interface StrategicEquilibrium {
  timescale: 'day' | 'week' | 'month' | 'quarter' | 'year';
  equilibrium: any;
  rationale: any;
  predictedOutcomes?: any;
  confidence: number;
}

export interface StrategyRecommendation {
  title: string;
  description: string;
  timescale: 'day' | 'week' | 'month' | 'quarter';
  priority: number;
  scope?: string;
  context?: any;
  recommendedActions?: any[];
}

