/**
 * Emotional Intelligence Engine v1
 * lib/emotional/engine.ts
 * 
 * Mood tracking, emotional check-ins, pattern detection, and supportive interventions
 */

import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { callAIJson } from "@/lib/ai/call";

// ============================================
// TYPES
// ============================================

export type MoodLevel = "great" | "good" | "okay" | "bad" | "terrible";

export interface EmotionalCheckIn {
  id: string;
  userId: string;
  mood: MoodLevel;
  energy: number;
  stress: number;
  notes: string | null;
  triggers: string[];
  activities: string[];
  checkedInAt: Date;
}

export interface EmotionalPattern {
  id: string;
  userId: string;
  patternType: string;
  title: string;
  description: string | null;
  confidence: number;
  data: Record<string, any>;
  occurrences: number;
}

export interface EmotionalState {
  currentMood: MoodLevel | null;
  energyLevel: number | null;
  stressLevel: number | null;
  lastCheckIn: Date | null;
  recentTrend: "improving" | "stable" | "declining" | "unknown";
  needsSupport: boolean;
  suggestedIntervention: string | null;
}

export interface CheckInInput {
  userId: string;
  mood: MoodLevel;
  energy: number;
  stress: number;
  notes?: string;
  triggers?: string[];
  activities?: string[];
}

// ============================================
// MOOD SCORES
// ============================================

const MOOD_SCORES: Record<MoodLevel, number> = {
  great: 100,
  good: 75,
  okay: 50,
  bad: 25,
  terrible: 0,
};

// ============================================
// CHECK-IN FUNCTIONS
// ============================================

/**
 * Record an emotional check-in
 */
export async function recordCheckIn(input: CheckInInput): Promise<EmotionalCheckIn> {
  const { userId, mood, energy, stress, notes, triggers, activities } = input;

  const { data, error } = await getSupabaseAdminRuntimeClient()
    .from("emotional_checkins")
    .insert({
      user_id: userId,
      mood,
      energy: Math.max(1, Math.min(5, energy)),
      stress: Math.max(1, Math.min(5, stress)),
      notes: notes || null,
      triggers: triggers || [],
      activities: activities || [],
    })
    .select("*")
    .single();

  if (error) {
    throw new Error("Failed to record check-in");
  }

  // Analyze patterns in background
  analyzeEmotionalPatterns(userId).catch(console.error);

  return mapRowToCheckIn(data);
}

/**
 * Get recent check-ins
 */
export async function getRecentCheckIns(
  userId: string,
  limit: number = 7
): Promise<EmotionalCheckIn[]> {
  const { data } = await getSupabaseAdminRuntimeClient()
    .from("emotional_checkins")
    .select("*")
    .eq("user_id", userId)
    .order("checked_in_at", { ascending: false })
    .limit(limit);

  return (data || []).map(mapRowToCheckIn);
}

/**
 * Get today's check-in if exists
 */
export async function getTodaysCheckIn(userId: string): Promise<EmotionalCheckIn | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data } = await getSupabaseAdminRuntimeClient()
    .from("emotional_checkins")
    .select("*")
    .eq("user_id", userId)
    .gte("checked_in_at", today.toISOString())
    .order("checked_in_at", { ascending: false })
    .limit(1)
    .single();

  return data ? mapRowToCheckIn(data) : null;
}

// ============================================
// EMOTIONAL STATE
// ============================================

/**
 * Get current emotional state with trend analysis
 */
export async function getEmotionalState(userId: string): Promise<EmotionalState> {
  const recentCheckIns = await getRecentCheckIns(userId, 7);

  if (recentCheckIns.length === 0) {
    return {
      currentMood: null,
      energyLevel: null,
      stressLevel: null,
      lastCheckIn: null,
      recentTrend: "unknown",
      needsSupport: false,
      suggestedIntervention: null,
    };
  }

  const latest = recentCheckIns[0];
  const trend = calculateTrend(recentCheckIns);
  const needsSupport = shouldOfferSupport(latest, trend);
  const intervention = needsSupport ? suggestIntervention(latest, trend) : null;

  return {
    currentMood: latest.mood,
    energyLevel: latest.energy,
    stressLevel: latest.stress,
    lastCheckIn: latest.checkedInAt,
    recentTrend: trend,
    needsSupport,
    suggestedIntervention: intervention,
  };
}

/**
 * Calculate mood trend from recent check-ins
 */
function calculateTrend(
  checkIns: EmotionalCheckIn[]
): "improving" | "stable" | "declining" | "unknown" {
  if (checkIns.length < 2) return "unknown";

  const scores = checkIns.slice(0, 5).map((c) => MOOD_SCORES[c.mood]);
  const recent = scores.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
  const older = scores.slice(2).reduce((a, b) => a + b, 0) / Math.max(1, scores.length - 2);

  const diff = recent - older;

  if (diff > 10) return "improving";
  if (diff < -10) return "declining";
  return "stable";
}

/**
 * Determine if user needs emotional support
 */
function shouldOfferSupport(
  latest: EmotionalCheckIn,
  trend: string
): boolean {
  // Low mood
  if (MOOD_SCORES[latest.mood] <= 25) return true;
  // High stress
  if (latest.stress >= 4) return true;
  // Low energy with declining trend
  if (latest.energy <= 2 && trend === "declining") return true;
  // Declining trend over multiple days
  if (trend === "declining" && MOOD_SCORES[latest.mood] <= 50) return true;

  return false;
}

/**
 * Suggest an intervention based on state
 */
function suggestIntervention(
  latest: EmotionalCheckIn,
  trend: string
): string {
  if (latest.stress >= 4) {
    return "breathing_exercise";
  }
  if (MOOD_SCORES[latest.mood] <= 25) {
    return "supportive_chat";
  }
  if (latest.energy <= 2) {
    return "energy_boost";
  }
  if (trend === "declining") {
    return "check_in_conversation";
  }
  return "affirmation";
}

// ============================================
// PATTERN ANALYSIS
// ============================================

/**
 * Analyze emotional patterns (called async after check-ins)
 */
async function analyzeEmotionalPatterns(userId: string): Promise<void> {
  const checkIns = await getRecentCheckIns(userId, 30);
  if (checkIns.length < 5) return;

  // Analyze trigger patterns
  const triggerCounts: Record<string, { good: number; bad: number }> = {};

  checkIns.forEach((c) => {
    c.triggers.forEach((trigger) => {
      if (!triggerCounts[trigger]) {
        triggerCounts[trigger] = { good: 0, bad: 0 };
      }
      if (MOOD_SCORES[c.mood] >= 75) {
        triggerCounts[trigger].good++;
      } else if (MOOD_SCORES[c.mood] <= 25) {
        triggerCounts[trigger].bad++;
      }
    });
  });

  // Store significant patterns
  for (const [trigger, counts] of Object.entries(triggerCounts)) {
    const total = counts.good + counts.bad;
    if (total < 3) continue;

    const badRatio = counts.bad / total;
    if (badRatio > 0.6) {
      await upsertPattern(userId, {
        patternType: "trigger",
        title: `"${trigger}" often correlates with lower mood`,
        description: `When you mention "${trigger}", your mood tends to be lower.`,
        confidence: Math.min(0.9, 0.5 + badRatio * 0.4),
        data: { trigger, counts },
      });
    }
  }

  // Analyze time patterns (day of week)
  const dayScores: Record<number, number[]> = {};
  checkIns.forEach((c) => {
    const day = c.checkedInAt.getDay();
    if (!dayScores[day]) dayScores[day] = [];
    dayScores[day].push(MOOD_SCORES[c.mood]);
  });

  const avgByDay: Record<number, number> = {};
  for (const [day, scores] of Object.entries(dayScores)) {
    avgByDay[parseInt(day)] = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const worstDay = Object.entries(avgByDay).sort((a, b) => a[1] - b[1])[0];
  const bestDay = Object.entries(avgByDay).sort((a, b) => b[1] - a[1])[0];

  if (worstDay && bestDay && avgByDay[parseInt(bestDay[0])] - avgByDay[parseInt(worstDay[0])] > 20) {
    await upsertPattern(userId, {
      patternType: "cycle",
      title: `${dayNames[parseInt(worstDay[0])]}s tend to be harder`,
      description: `Your mood is typically lower on ${dayNames[parseInt(worstDay[0])]}s compared to ${dayNames[parseInt(bestDay[0])]}s.`,
      confidence: 0.7,
      data: { avgByDay },
    });
  }
}

/**
 * Upsert an emotional pattern
 */
async function upsertPattern(
  userId: string,
  pattern: {
    patternType: string;
    title: string;
    description: string;
    confidence: number;
    data: Record<string, any>;
  }
): Promise<void> {
  // Check if pattern already exists
  const { data: existing } = await getSupabaseAdminRuntimeClient()
    .from("emotional_patterns")
    .select("id, occurrences")
    .eq("user_id", userId)
    .eq("title", pattern.title)
    .single();

  if (existing) {
    await getSupabaseAdminRuntimeClient()
      .from("emotional_patterns")
      .update({
        confidence: pattern.confidence,
        data: pattern.data,
        last_confirmed_at: new Date().toISOString(),
        occurrences: existing.occurrences + 1,
      })
      .eq("id", existing.id);
  } else {
    await getSupabaseAdminRuntimeClient().from("emotional_patterns").insert({
      user_id: userId,
      pattern_type: pattern.patternType,
      title: pattern.title,
      description: pattern.description,
      confidence: pattern.confidence,
      data: pattern.data,
    });
  }
}

/**
 * Get user's detected patterns
 */
export async function getEmotionalPatterns(userId: string): Promise<EmotionalPattern[]> {
  const { data } = await getSupabaseAdminRuntimeClient()
    .from("emotional_patterns")
    .select("*")
    .eq("user_id", userId)
    .order("confidence", { ascending: false })
    .limit(10);

  return (data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    patternType: row.pattern_type,
    title: row.title,
    description: row.description,
    confidence: row.confidence,
    data: row.data,
    occurrences: row.occurrences,
  }));
}

// ============================================
// SUPPORTIVE INTERVENTIONS
// ============================================

/**
 * Generate a supportive response based on emotional state
 */
export async function generateSupportiveResponse(
  userId: string,
  context?: string
): Promise<{ message: string; interventionType: string }> {
  const state = await getEmotionalState(userId);

  const aiResult = await callAIJson<{ message: string; type: string }>({
    userId,
    feature: "emotional_support",
    systemPrompt: `You are a warm, supportive AI companion. Your role is to provide brief, genuine emotional support. Be empathetic but not patronizing. Keep responses under 2-3 sentences.`,
    userPrompt: `User's current state:
- Mood: ${state.currentMood || "unknown"}
- Energy: ${state.energyLevel || "unknown"}/5
- Stress: ${state.stressLevel || "unknown"}/5
- Recent trend: ${state.recentTrend}
${context ? `- Context: ${context}` : ""}

Provide a brief supportive message. Output as JSON:
{
  "message": "Your supportive message here",
  "type": "affirmation" | "validation" | "encouragement" | "reframe" | "resource"
}`,
    maxTokens: 200,
    temperature: 0.7,
  });

  if (aiResult.success && aiResult.data) {
    // Log the interaction
    await getSupabaseAdminRuntimeClient().from("emotional_support_logs").insert({
      user_id: userId,
      trigger: context || "check_in",
      intervention_type: aiResult.data.type,
      content: aiResult.data.message,
    });

    return {
      message: aiResult.data.message,
      interventionType: aiResult.data.type,
    };
  }

  return {
    message: "I'm here with you. Take things one step at a time.",
    interventionType: "affirmation",
  };
}

// ============================================
// HELPERS
// ============================================

function mapRowToCheckIn(row: any): EmotionalCheckIn {
  return {
    id: row.id,
    userId: row.user_id,
    mood: row.mood,
    energy: row.energy,
    stress: row.stress,
    notes: row.notes,
    triggers: row.triggers || [],
    activities: row.activities || [],
    checkedInAt: new Date(row.checked_in_at),
  };
}