// Emotion OS Types

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
// ============================================
// CORE FUNCTIONS
// ============================================

import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Get current emotion state
export async function getCurrentEmotionState(
  userId: string
): Promise<EmotionState | null> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from("emo_states")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(1)
    .single();

  return data;
}

// Get recent emotion states
export async function getRecentEmotionStates(
  userId: string,
  hours: number = 24
): Promise<EmotionState[]> {
  const supabase = getSupabase();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("emo_states")
    .select("*")
    .eq("user_id", userId)
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false });

  return data || [];
}

// Record check-in
export async function recordCheckin(
  userId: string,
  input: RecordCheckinInput
): Promise<EmotionCheckin> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("emo_checkins")
    .insert({
      user_id: userId,
      checkin_type: input.checkin_type || "manual",
      emotion: input.emotion,
      intensity: input.intensity,
      energy_level: input.energy_level,
      notes: input.notes,
      context_tags: input.context_tags || [],
    })
    .select()
    .single();

  if (error) throw error;

  // Also store as emotion state
  await supabase.from("emo_states").insert({
    user_id: userId,
    source: "checkin",
    source_id: data.id,
    detected_emotion: input.emotion,
    intensity: input.intensity,
    confidence: 1.0,
    tags: input.context_tags || [],
    raw_signal: { notes: input.notes, energy_level: input.energy_level },
    occurred_at: new Date().toISOString(),
  });

  return data;
}

// Get emotion trend
export async function getEmotionTrend(
  userId: string,
  period: "day" | "week" | "month" = "week"
): Promise<EmotionTrend> {
  const supabase = getSupabase();

  const daysMap = { day: 1, week: 7, month: 30 };
  const days = daysMap[period];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: states } = await supabase
    .from("emo_states")
    .select("*")
    .eq("user_id", userId)
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: true });

  if (!states?.length) {
    return {
      period,
      dominant_emotion: "neutral",
      average_intensity: 0,
      average_valence: 0,
      volatility: 0,
      emotion_distribution: {} as Record<EmotionType, number>,
      notable_patterns: [],
    };
  }

  const distribution: Record<string, number> = {};
  let totalIntensity = 0;
  let totalValence = 0;

  for (const state of states) {
    distribution[state.detected_emotion] = (distribution[state.detected_emotion] || 0) + 1;
    totalIntensity += state.intensity;
    totalValence += state.valence || 0;
  }

  const dominant = Object.entries(distribution).sort((a, b) => b[1] - a[1])[0][0] as EmotionType;
  const avgIntensity = totalIntensity / states.length;
  const intensities = states.map((s) => s.intensity);
  const volatility = Math.sqrt(
    intensities.reduce((sum, i) => sum + Math.pow(i - avgIntensity, 2), 0) / states.length
  ) || 0;

  return {
    period,
    dominant_emotion: dominant,
    average_intensity: avgIntensity,
    average_valence: totalValence / states.length,
    volatility,
    emotion_distribution: distribution as Record<EmotionType, number>,
    notable_patterns: [],
  };
}

// Get emotion context
export async function getEmotionContext(userId: string): Promise<EmotionContext> {
  const [current, recent, trend] = await Promise.all([
    getCurrentEmotionState(userId),
    getRecentEmotionStates(userId, 24),
    getEmotionTrend(userId, "week"),
  ]);

  return {
    current_state: current || undefined,
    recent_states: recent,
    trend,
    active_interventions: [],
    suggested_responses: [],
  };
}

// Detect and store emotion
export async function detectAndStoreEmotion(
  userId: string,
  input: DetectEmotionInput
): Promise<EmotionState> {
  const supabase = getSupabase();

  // Simple detection (would use LLM in production)
  const analysis: EmotionAnalysis = {
    primary_emotion: "neutral",
    intensity: 0.5,
    confidence: 0.7,
    valence: 0,
    arousal: 0.5,
    secondary_emotions: [],
    context_tags: [],
    reasoning: "Basic detection",
  };

  const { data, error } = await supabase
    .from("emo_states")
    .insert({
      user_id: userId,
      source: input.source,
      source_id: input.source_id,
      detected_emotion: analysis.primary_emotion,
      intensity: analysis.intensity,
      confidence: analysis.confidence,
      valence: analysis.valence,
      arousal: analysis.arousal,
      tags: analysis.context_tags,
      raw_signal: { reasoning: analysis.reasoning },
      context_summary: analysis.reasoning,
      occurred_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Log intervention
export async function logIntervention(
  userId: string,
  input: LogInterventionInput
): Promise<EmotionIntervention> {
  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from("emo_interventions")
    .select("*")
    .eq("user_id", userId)
    .eq("intervention_type", input.intervention_type)
    .eq("intervention_name", input.intervention_name)
    .single();

  if (existing) {
    const timesEffective = input.was_effective ? existing.times_effective + 1 : existing.times_effective;
    
    const { data, error } = await supabase
      .from("emo_interventions")
      .update({
        times_used: existing.times_used + 1,
        times_effective: timesEffective,
        effectiveness_score: timesEffective / (existing.times_used + 1),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("emo_interventions")
    .insert({
      user_id: userId,
      intervention_type: input.intervention_type,
      intervention_name: input.intervention_name,
      effectiveness_score: input.was_effective ? 1.0 : 0.0,
      times_used: 1,
      times_effective: input.was_effective ? 1 : 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get effective interventions
export async function getEffectiveInterventions(
  userId: string,
  emotion?: EmotionType
): Promise<EmotionIntervention[]> {
  const supabase = getSupabase();

  let query = supabase
    .from("emo_interventions")
    .select("*")
    .eq("user_id", userId)
    .gte("effectiveness_score", 0.5)
    .order("effectiveness_score", { ascending: false });

  if (emotion) {
    query = query.eq("target_emotion", emotion);
  }

  const { data } = await query.limit(10);
  return data || [];
}

// Export as namespace
export const EmotionOS = {
  getCurrentEmotionState,
  getRecentEmotionStates,
  recordCheckin,
  getEmotionTrend,
  getEmotionContext,
  detectAndStoreEmotion,
  logIntervention,
  getEffectiveInterventions,
};

export default EmotionOS;
