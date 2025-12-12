// Meta-Coach Types
// lib/meta-coach/types.ts

export type MetaCoachActionType =
  | "stay_with_current_coach"
  | "switch_coach"
  | "trigger_intervention"
  | "reschedule_block"
  | "prep_briefing";

export interface MetaCoachDecision {
  action: MetaCoachActionType;
  targetCoachId?: string;
  interventionKey?: string;
  reason: string;
}

export interface MetaCoachContext {
  userId: string;
  currentCoachId: string;
  emotionPrimary: string | null;
  riskPrediction?: {
    risk_type: string;
    risk_score: number;
    window_start: string;
  } | null;
  recentTurns?: {
    coachId: string;
    emotion: string | null;
    intent: string | null;
  }[];
}

