// Strategic Mind Types
// lib/strategic_mind/types.ts

export type GoalTimescale = 'lifetime' | '5_year' | 'year' | 'quarter' | 'month' | 'week' | 'day';

export interface GoalHierarchyInput {
  timescale: GoalTimescale;
  title: string;
  description?: string;
  importance: number; // 0..1
  alignment?: any;
  feasibility?: any;
  dependencies?: any;
  blockers?: any;
}

export interface StrategicStateSnapshot {
  activeGoals?: any[];
  dominantNeeds?: any[];
  predictedRisks?: any[];
  opportunities?: any[];
  subsystemSignals?: any;
  conflicts?: any[];
  chosenEquilibrium?: any;
  confidence: number;
}

export interface StrategicConflict {
  conflictType: 'time' | 'emotion' | 'relationship' | 'culture' | 'identity';
  description: string;
  severity: number; // 0..1
  involvedGoals?: any[];
  subsystemInputs?: any;
  recommendedResolutions?: any[];
}


