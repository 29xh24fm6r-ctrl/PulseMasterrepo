// Behavior Prediction Types
// lib/prediction/types.ts

export type RiskType =
  | "stress_spike"
  | "procrastination"
  | "overwhelm"
  | "burnout"
  | "slump";

export interface BehaviorPrediction {
  id: string;
  user_id: string;
  prediction_date: string;
  window_start: string;
  window_end: string;
  context: string;
  context_id: string | null;
  risk_type: RiskType;
  risk_score: number;
  recommended_action: string;
  created_at: string;
}

export interface WindowContext {
  window_start: string;
  window_end: string;
  context: string; // "calendar_event" | "task_block" | "generic"
  context_id: string;
  tags: string[]; // e.g. ["deep_work", "sales_calls"]
}

