// Server-only exports for emotion-os
// lib/emotion-os/server.ts

import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  EmotionState,
  EmotionCheckin,
  EmotionTrend,
  EmotionContext,
  EmotionIntervention,
  DetectEmotionInput,
  RecordCheckinInput,
  LogInterventionInput,
  EmotionAnalysis,
} from "./types";

// Get current emotion state
// userId can be either Clerk ID or database UUID
export async function getCurrentEmotionState(
  userId: string
): Promise<EmotionState | null> {
  const supabase = supabaseAdmin;

  // Try to resolve database ID if userId is a Clerk ID
  let dbUserId = userId;
  try {
    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();
    
    if (userRow?.id) {
      dbUserId = userRow.id;
    }
  } catch {
    // If lookup fails, assume userId is already a database ID
  }

  const { data } = await supabase
    .from("emo_states")
    .select("*")
    .eq("user_id", dbUserId)
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data || null;
}

// Get recent emotion states
export async function getRecentEmotionStates(
  userId: string,
  hours: number = 24
): Promise<EmotionState[]> {
  const supabase = supabaseAdmin;
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
  const supabase = supabaseAdmin;

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

  // Trigger AGI if significant emotion state detected
  if (input.intensity && input.intensity > 0.7) {
    const emotion = input.emotion?.toLowerCase() || "";
    const isStressed = emotion.includes("stressed") || emotion.includes("overwhelmed") || emotion.includes("burned_out");
    
    if (isStressed) {
      try {
        const { handleAGIEvent } = await import("@/lib/agi/orchestrator");
        const { emotionSignalTrigger } = await import("@/lib/agi/triggers");
        await handleAGIEvent(userId, emotionSignalTrigger({
          state: emotion,
          trend: "rising",
          intensity: input.intensity,
        }));
      } catch (agiErr) {
        // Don't fail emotion recording if AGI fails
        console.warn("[EmotionOS] AGI trigger failed:", agiErr);
      }
    }
  }

  return data;
}

// Get emotion trend
export async function getEmotionTrend(
  userId: string,
  period: "day" | "week" | "month" = "week"
): Promise<EmotionTrend> {
  const supabase = supabaseAdmin;

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
      emotion_distribution: {} as Record<string, number>,
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

  const dominant = Object.entries(distribution).sort((a, b) => b[1] - a[1])[0][0] as any;
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
    emotion_distribution: distribution as any,
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
  const supabase = supabaseAdmin;

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
  const supabase = supabaseAdmin;

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
  emotion?: string
): Promise<EmotionIntervention[]> {
  const supabase = supabaseAdmin;

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

