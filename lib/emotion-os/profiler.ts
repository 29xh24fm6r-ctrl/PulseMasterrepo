// Emotion OS - Nightly profile aggregation
import { createClient } from "@supabase/supabase-js";
import { llmJson } from "../llm/client";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface EmotionProfile {
  dominant_emotions: string[];
  average_valence: number;
  average_intensity: number;
  emotional_volatility: number;
  trigger_patterns: string[];
  time_patterns: Record<string, string>; // hour -> common emotion
  weekly_trend: "improving" | "stable" | "declining";
}

export async function buildEmotionProfile(userId: string): Promise<EmotionProfile | null> {
  const supabase = getSupabase();
  
  // Get last 7 days of emotion states
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data: states } = await supabase
    .from("emo_states")
    .select("*")
    .eq("user_id", userId)
    .gte("occurred_at", weekAgo)
    .order("occurred_at", { ascending: false });

  if (!states || states.length < 3) return null;

  // Calculate aggregates
  const emotionCounts: Record<string, number> = {};
  let totalValence = 0;
  let totalIntensity = 0;
  const allTriggers: string[] = [];
  const hourlyEmotions: Record<number, string[]> = {};
  const valenceHistory: number[] = [];

  for (const state of states) {
    // Count emotions
    emotionCounts[state.detected_emotion] = (emotionCounts[state.detected_emotion] || 0) + 1;
    
    // Sum for averages
    totalValence += state.valence || 0;
    totalIntensity += state.intensity || 0;
    valenceHistory.push(state.valence || 0);
    
    // Collect triggers
    if (state.triggers) allTriggers.push(...state.triggers);
    
    // Track by hour
    const hour = new Date(state.occurred_at).getHours();
    if (!hourlyEmotions[hour]) hourlyEmotions[hour] = [];
    hourlyEmotions[hour].push(state.detected_emotion);
  }

  // Calculate dominant emotions
  const sortedEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emotion]) => emotion);

  // Calculate volatility (standard deviation of valence)
  const avgValence = totalValence / states.length;
  const variance = valenceHistory.reduce((sum, v) => sum + Math.pow(v - avgValence, 2), 0) / states.length;
  const volatility = Math.sqrt(variance);

  // Find common triggers
  const triggerCounts: Record<string, number> = {};
  for (const t of allTriggers) {
    triggerCounts[t] = (triggerCounts[t] || 0) + 1;
  }
  const topTriggers = Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([trigger]) => trigger);

  // Calculate time patterns
  const timePatterns: Record<string, string> = {};
  for (const [hour, emotions] of Object.entries(hourlyEmotions)) {
    const counts: Record<string, number> = {};
    for (const e of emotions) counts[e] = (counts[e] || 0) + 1;
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (dominant) timePatterns[hour] = dominant[0];
  }

  // Determine weekly trend
  const firstHalf = valenceHistory.slice(0, Math.floor(valenceHistory.length / 2));
  const secondHalf = valenceHistory.slice(Math.floor(valenceHistory.length / 2));
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const trend = secondAvg > firstAvg + 0.1 ? "improving" : secondAvg < firstAvg - 0.1 ? "declining" : "stable";

  const profile: EmotionProfile = {
    dominant_emotions: sortedEmotions,
    average_valence: totalValence / states.length,
    average_intensity: totalIntensity / states.length,
    emotional_volatility: volatility,
    trigger_patterns: topTriggers,
    time_patterns: timePatterns,
    weekly_trend: trend,
  };

  // Store/update profile
  const { error } = await supabase.from("emo_profiles").upsert({
    user_id: userId,
    dominant_emotions: profile.dominant_emotions,
    average_valence: profile.average_valence,
    average_intensity: profile.average_intensity,
    emotional_volatility: profile.emotional_volatility,
    trigger_patterns: profile.trigger_patterns,
    time_patterns: profile.time_patterns,
    weekly_trend: profile.weekly_trend,
    states_analyzed: states.length,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (error) console.error("Failed to store emotion profile:", error);

  return profile;
}

export async function runNightlyProfiler(): Promise<{ profilesUpdated: number }> {
  const supabase = getSupabase();
  
  // Get users with emotion states in last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data: users } = await supabase
    .from("emo_states")
    .select("user_id")
    .gte("occurred_at", weekAgo);

  const uniqueUsers = [...new Set(users?.map(u => u.user_id) || [])];
  
  let updated = 0;
  for (const userId of uniqueUsers) {
    const profile = await buildEmotionProfile(userId);
    if (profile) updated++;
  }

  return { profilesUpdated: updated };
}

export default { buildEmotionProfile, runNightlyProfiler };