// Intervention Types
// lib/interventions/types.ts

export type InterventionCategory =
  | "emotional_regulation"
  | "focus"
  | "motivation"
  | "relational"
  | "recovery";

export interface Intervention {
  id: string;
  key: string;
  category: InterventionCategory;
  label: string;
  description?: string | null;
  coach_id?: string | null;
  min_duration_seconds: number;
  max_duration_seconds: number;
  active: boolean;
}

export interface InterventionTriggerContext {
  userId: string;
  coachId?: string;
  emotion?: string | null;
  riskType?: string | null;
  riskScore?: number | null;
  patternType?: string | null;
  patternKey?: string | null;
}

export interface ChosenIntervention {
  intervention: Intervention;
  reason: string;
}

