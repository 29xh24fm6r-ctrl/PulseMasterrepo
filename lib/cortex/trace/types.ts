// Pulse Cortex Trace Types
// lib/cortex/trace/types.ts

export type TraceSource =
  | "cortex"
  | "autonomy"
  | "executive"
  | "third_brain"
  | "emotion"
  | "longitudinal"
  | "mesh";

export type TraceLevel = "info" | "debug" | "warn" | "error";

export interface PulseTraceEntry {
  id: string;
  userId: string;
  timestamp: string;
  source: TraceSource;
  level: TraceLevel;
  message: string;
  data?: Record<string, any>;
  context?: {
    domain?: string;
    actionId?: string;
    policyId?: string;
    objectiveId?: string;
  };
}



