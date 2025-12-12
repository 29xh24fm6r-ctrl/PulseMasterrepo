// Master Brain Registry Types
// lib/brain/registry/types.ts

export type BrainSubsystemStatusValue =
  | 'inactive'
  | 'initializing'
  | 'partial'
  | 'active'
  | 'degraded'
  | 'error';

export interface BrainSubsystemStatusInput {
  subsystemId: string;
  status: BrainSubsystemStatusValue;
  lastOkAt?: string | null;
  lastErrorAt?: string | null;
  lastRunAt?: string | null;
  healthScore?: number | null;
  details?: any;
}

export interface BrainHealthSnapshot {
  overallHealth: number;
  coverageScore: number;
  errorPressure: number;
  latencyPressure: number;
  dataFreshnessScore: number;
  subsystemScores: Record<string, number>;
  missingSubsystems: string[];
  notes?: string;
  recommendations?: any;
}


