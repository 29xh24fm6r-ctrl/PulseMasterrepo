// Emotion OS Types (client-safe)
// lib/emotion-os/types.ts

export type EmotionType =
  | "calm"
  | "stressed"
  | "overwhelmed"
  | "anxious"
  | "angry"
  | "sad"
  | "motivated"
  | "confident"
  | "excited"
  | "frustrated"
  | "neutral"
  | "happy"
  | "hopeful"
  | "grateful"
  | "content"
  | "tired"
  | "bored"
  | "confused"
  | "fearful";

export type EmotionSource =
  | "journal"
  | "voice"
  | "chat"
  | "checkin"
  | "behavior"
  | "calendar"
  | "task"
  | "email";

export type InterventionType =
  | "breathing"
  | "movement"
  | "journaling"
  | "social"
  | "rest"
  | "reframe"
  | "action"
  | "distraction"
  | "nature"
  | "music"
  | "meditation";

export type AdaptiveResponseType =
  | "tone_shift"
  | "offer_support"
  | "reduce_load"
  | "celebrate"
  | "check_in"
  | "suggest_break"
  | "encourage"
  | "simplify";

export interface EmotionState {
  id: string;
  user_id: string;
  source: EmotionSource;
  source_id?: string;
  detected_emotion: EmotionType;
  intensity: number;          // 0-1
  confidence: number;         // 0-1
  valence?: number;           // -1 to +1 (negative to positive)
  arousal?: number;           // 0 to 1 (calm to activated)
  tags: string[];
  raw_signal: Record<string, any>;
  context_summary?: string;
  occurred_at: string;
  created_at: string;
}

export interface EmotionProfile {
  user_id: string;
  baselines: {
    default_mood?: EmotionType;
    typical_intensity?: number;
    morning_tendency?: string;
    evening_tendency?: string;
    stress_threshold?: number;
  };
  triggers: {
    stress_triggers?: string[];
    joy_triggers?: string[];
    anxiety_triggers?: string[];
    motivation_triggers?: string[];
  };
  regulators: {
    effective?: string[];
    ineffective?: string[];
    preferred?: string[];
  };
  patterns: {
    weekly_pattern?: Record<string, any>;
    time_of_day?: Record<string, any>;
    seasonal?: Record<string, any>;
  };
  created_at: string;
  updated_at: string;
}

export interface EmotionTransition {
  id: string;
  user_id: string;
  from_emotion: EmotionType;
  to_emotion: EmotionType;
  from_intensity: number;
  to_intensity: number;
  trigger_type?: string;
  trigger_description?: string;
  duration_minutes?: number;
  intervention_used?: string;
  occurred_at: string;
  created_at: string;
}

export interface EmotionCheckin {
  id: string;
  user_id: string;
  checkin_type: "manual" | "prompted" | "scheduled";
  emotion: EmotionType;
  intensity: number;
  energy_level?: number;
  notes?: string;
  context_tags: string[];
  created_at: string;
}

export interface EmotionIntervention {
  id: string;
  user_id: string;
  intervention_type: InterventionType;
  intervention_name: string;
  target_emotion?: EmotionType;
  effectiveness_score?: number;
  times_used: number;
  times_effective: number;
  average_shift?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AdaptiveResponse {
  id: string;
  user_id: string;
  emotion_state: EmotionType;
  intensity_threshold: number;
  response_type: AdaptiveResponseType;
  response_config: Record<string, any>;
  enabled: boolean;
  times_triggered: number;
  last_triggered_at?: string;
  created_at: string;
}

// Analysis types
export interface EmotionAnalysis {
  primary_emotion: EmotionType;
  intensity: number;
  confidence: number;
  valence: number;
  arousal: number;
  secondary_emotions: Array<{ emotion: EmotionType; intensity: number }>;
  context_tags: string[];
  reasoning: string;
}

export interface EmotionTrend {
  period: "day" | "week" | "month";
  dominant_emotion: EmotionType;
  average_intensity: number;
  average_valence: number;
  volatility: number;         // how much emotions fluctuate
  emotion_distribution: Record<EmotionType, number>;
  notable_patterns: string[];
}

export interface EmotionContext {
  current_state?: EmotionState;
  recent_states: EmotionState[];
  profile?: EmotionProfile;
  trend?: EmotionTrend;
  active_interventions: EmotionIntervention[];
  suggested_responses: AdaptiveResponse[];
}

// Input types
export interface DetectEmotionInput {
  text: string;
  source: EmotionSource;
  source_id?: string;
  additional_context?: string;
}

export interface RecordCheckinInput {
  emotion: EmotionType;
  intensity: number;
  energy_level?: number;
  notes?: string;
  context_tags?: string[];
  checkin_type?: "manual" | "prompted" | "scheduled";
}

export interface LogInterventionInput {
  intervention_type: InterventionType;
  intervention_name: string;
  was_effective: boolean;
  emotion_before?: EmotionType;
  emotion_after?: EmotionType;
  intensity_before?: number;
  intensity_after?: number;
  notes?: string;
}

