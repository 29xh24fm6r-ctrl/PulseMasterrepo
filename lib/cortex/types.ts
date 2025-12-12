// Neocortex Types
// lib/cortex/types.ts

export type CortexAreaKey = 'work' | 'money' | 'relationships' | 'health' | 'learning';

export interface CortexEvent {
  userId: string;
  areaKey: CortexAreaKey;
  source: 'tasks' | 'deals' | 'calendar' | 'email' | 'notes' | 'habits' | string;
  eventType: string; // e.g. 'TASK_COMPLETED'
  eventTime: Date;
  contextId?: string;
  contextType?: string;
  payload?: Record<string, any>;
}

export interface CortexSignal {
  userId: string;
  areaKey: CortexAreaKey;
  windowDate: string; // 'YYYY-MM-DD'
  scope: 'global' | 'deal' | 'pipeline' | 'task' | 'meeting';
  scopeRef?: string;
  key: string;
  valueNumeric?: number;
  valueJson?: any;
  sampleCount?: number;
  meta?: any;
}

export interface CortexPattern {
  id?: string;
  userId: string;
  areaKey: CortexAreaKey;
  key: string;
  name: string;
  description: string;
  patternType: 'time_series' | 'correlation' | 'sequence';
  signalKeys: string[];
  stats: any;
  examples: any;
  strength: number;
  lastObservedAt?: Date;
}

export interface CortexSkill {
  id?: string;
  userId: string;
  areaKey: CortexAreaKey;
  key: string;
  name: string;
  description: string;
  trigger: any;
  steps: any[];
  derivedFromPatternIds?: string[];
}

export interface CortexPrediction {
  id?: string;
  userId: string;
  areaKey: CortexAreaKey;
  kind: 'risk' | 'opportunity' | 'forecast';
  targetScope: string;
  targetRef?: string;
  horizon: string;
  summary: string;
  details?: any;
  confidence?: number;
  patternIds?: string[];
  validUntil?: Date;
}

export interface CortexAnomaly {
  id?: string;
  userId: string;
  areaKey: CortexAreaKey;
  windowDate: string;
  scope: string;
  scopeRef?: string;
  severity: number;
  summary: string;
  expected?: any;
  observed?: any;
}
