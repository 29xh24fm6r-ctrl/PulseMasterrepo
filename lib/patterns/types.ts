// Power Patterns Types
// lib/patterns/types.ts

export type PatternType =
  | "time_of_day"
  | "weekday"
  | "context_tag"
  | "coach"
  | "identity";

export interface PowerPattern {
  id: string;
  user_id: string;
  pattern_type: PatternType;
  key: string;
  emotion_dominant: string | null;
  emotion_score: number;
  positive_behavior: string[];
  negative_behavior: string[];
  confidence: number;
  sample_size: number;
  last_seen_at: string;
  created_at: string;
}

export interface PatternSourceEvent {
  timestamp: string;
  coach_id?: string | null;
  emotion?: string | null;
  context_tags?: string[]; // e.g. ["work", "calls", "deep_work"]
  voice_id?: string | null;
  intent?: string | null;
}

