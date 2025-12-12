// AGI Kernel v2 Types
// lib/agi_kernel/v2/types.ts

export type CognitiveRunKind = 'light' | 'nightly' | 'weekly_deep';

export interface CognitiveRunContext {
  kind: CognitiveRunKind;
  triggerType: 'schedule' | 'manual' | 'event';
  triggerSource: string;
  triggerReference?: any;
  now: Date;
}

export interface PhaseResult<T = any> {
  status: 'completed' | 'partial' | 'skipped' | 'failed';
  data?: T;
  errorSummary?: string;
}

export interface AggregatedBrainContext {
  // Light-weight aggregates from other subsystems
  memorySummary?: any;
  emotionSummary?: any;
  somaticSummary?: any;
  narrativeSummary?: any;
  identitySummary?: any;
  destinySummary?: any;
  timelineSummary?: any;
  relationshipSummary?: any;
  workSummary?: any;
  financialSummary?: any;
  brainHealthSummary?: any;
}


