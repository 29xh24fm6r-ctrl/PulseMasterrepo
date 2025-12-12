// Longitudinal Life Model Types
// lib/cortex/longitudinal/types.ts

export type LifeDomain =
  | "work"
  | "relationships"
  | "finance"
  | "life"
  | "strategy"
  | "health";

export interface LifeEvent {
  id: string;
  timestamp: string;
  domain: LifeDomain;
  type: string;
  description: string;
  metadata?: Record<string, any>;
  emotion?: string;
  intensity?: number;
}

export interface LifeChapter {
  id: string;
  title: string;
  start: string;
  end?: string;
  dominantEmotion?: string;
  narrativeSummary?: string;
  majorThemes?: string[];
  domainFocus?: LifeDomain[];
  keyEvents?: string[]; // LifeEvent IDs
  metadata?: Record<string, any>;
}

export interface LifePattern {
  id: string;
  type:
    | "procrastination_cycle"
    | "burnout_cycle"
    | "relationship_rhythm"
    | "productivity_arc"
    | "financial_stress_window"
    | "habit_burst"
    | "emotion_cycle"
    | "project_lifecycle";
  description: string;
  frequency?: string; // e.g., "weekly", "monthly"
  strength: number; // 0-1
  startDate: string;
  endDate?: string;
  metadata?: Record<string, any>;
}

export interface LongitudinalSnapshot {
  userId: string;
  chapters: LifeChapter[];
  rawEvents: LifeEvent[];
  aggregatedPatterns: LifePattern[];
  generatedAt: string;
  timeRange: {
    start: string;
    end: string;
  };
}



