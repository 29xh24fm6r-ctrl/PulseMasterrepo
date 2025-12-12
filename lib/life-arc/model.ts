// Life Arc Model Types
// lib/life-arc/model.ts

export type LifeArcKey =
  | "healing"
  | "emotional_stability"
  | "career_level_up"
  | "career_transition"
  | "financial_reset"
  | "relationship_restore"
  | "performance_push"
  | "identity_rebuild"
  | "health_rebuild"
  | "custom";

export interface LifeArc {
  id: string;
  userId: string;
  key: LifeArcKey;
  name: string;
  description?: string;
  status: "active" | "paused" | "completed";
  priority: number;
  startDate: string;
  targetDate?: string;
}

export interface LifeArcSource {
  id: string;
  arcId: string;
  sourceType: string;
  sourceId?: string;
  weight: number;
  metadata: Record<string, any>;
}

export interface LifeArcQuest {
  id: string;
  arcId: string;
  title: string;
  description?: string;
  status: "open" | "in_progress" | "done" | "dropped";
  dueDate?: string;
  difficulty: number;
  impact: number;
  sourceHint?: string;
}

export interface LifeArcCheckpoint {
  id: string;
  arcId: string;
  date: string;
  summary?: string;
  progressScore?: number;
  riskFlags: string[];
  metadata: Record<string, any>;
}

export interface LifeArcPlan {
  arcs: LifeArc[];
  questsByArc: Record<string, LifeArcQuest[]>;
  focusArc?: LifeArc;
}

export interface UserModelSnapshot {
  careerLevel?: string;
  careerProgress?: number;
  emotionState?: string;
  stressScore?: number;
  personaSoulLines?: Array<{
    coachId: string;
    phase?: string;
    progress?: number;
  }>;
  habitStreaks?: Array<{
    habitId: string;
    streak: number;
  }>;
  financeStress?: boolean;
  relationshipFlags?: string[];
}




