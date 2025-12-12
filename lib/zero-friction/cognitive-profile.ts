// Cognitive Profile Engine - Experience Ω
// lib/zero-friction/cognitive-profile.ts

import { supabaseAdmin } from "@/lib/supabase";
import { buildPulseCortexContext } from "@/lib/cortex/context";
import { getTwinModel } from "@/lib/twin/engine";
import { callAIJson } from "@/lib/ai/call";

export interface CognitiveProfile {
  modalityBias: "voice" | "visual" | "minimal" | "mixed";
  informationDensity: "low" | "medium" | "high";
  executionStyle: "structured" | "flow" | "exploratory" | "avoidance-prone";
  interactionSpeed: "slow" | "normal" | "fast";
  emotionalSensitivity: "low" | "medium" | "high";
  decisionMode: "logic" | "emotion" | "hybrid";
  confidenceScore: number; // 0-1
}

/**
 * Infer cognitive profile from user behavior
 */
export async function inferCognitiveProfile(userId: string): Promise<CognitiveProfile> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  // Get recent interaction events (last 7 days)
  const { data: events } = await supabaseAdmin
    .from("interaction_events")
    .select("*")
    .eq("user_id", dbUserId)
    .order("timestamp", { ascending: false })
    .limit(100);

  // Get Cortex context
  const ctx = await buildPulseCortexContext(userId);

  // Get Twin model
  const twin = await getTwinModel(userId);

  // Analyze interactions
  const voiceCount = events?.filter((e) => e.event_type === "voice").length || 0;
  const clickCount = events?.filter((e) => e.event_type === "click").length || 0;
  const hesitationCount = events?.filter((e) => e.event_type === "hesitation").length || 0;
  const backNavCount = events?.filter((e) => e.event_type === "back_navigation").length || 0;
  const screenSwitchCount = events?.filter((e) => e.event_type === "screen_switch").length || 0;

  // Calculate interaction speed (time between events)
  let avgTimeBetweenEvents = 0;
  if (events && events.length > 1) {
    const times = events
      .slice(0, -1)
      .map((e, i) => {
        const next = events[i + 1];
        return new Date(next.timestamp).getTime() - new Date(e.timestamp).getTime();
      });
    avgTimeBetweenEvents = times.reduce((a, b) => a + b, 0) / times.length;
  }

  // Use LLM to infer profile
  const systemPrompt = `You are inferring a user's cognitive profile from their behavior patterns.

Analyze:
- Interaction patterns (voice vs visual, speed, hesitation)
- Emotional patterns (volatility, sensitivity)
- Task completion patterns (structured vs flow)
- Decision patterns (logic vs emotion)

Generate a cognitive profile with:
- modality_bias: voice | visual | minimal | mixed
- information_density: low | medium | high
- execution_style: structured | flow | exploratory | avoidance-prone
- interaction_speed: slow | normal | fast
- emotional_sensitivity: low | medium | high
- decision_mode: logic | emotion | hybrid
- confidence_score: 0-1 (how confident in this profile)`;

  const userPrompt = `Interaction Events (last 7 days):
- Total events: ${events?.length || 0}
- Voice interactions: ${voiceCount}
- Click interactions: ${clickCount}
- Hesitations: ${hesitationCount}
- Back navigations: ${backNavCount}
- Screen switches: ${screenSwitchCount}
- Avg time between events: ${avgTimeBetweenEvents}ms

Current State:
- Emotion: ${ctx.emotion?.detected_emotion || "neutral"}
- Energy: ${ctx.cognitiveProfile?.currentEnergyLevel || 0.5}

Twin Model:
- Strengths: ${JSON.stringify(twin?.strengths || [])}
- Risk Patterns: ${JSON.stringify(twin?.riskPatterns || [])}

Infer cognitive profile.`;

  const response = await callAIJson<CognitiveProfile>({
    userId,
    feature: "cognitive_profile_inference",
    systemPrompt,
    userPrompt,
    maxTokens: 500,
    temperature: 0.3,
  });

  if (!response.success || !response.data) {
    // Fallback to default
    return {
      modalityBias: "mixed",
      informationDensity: "medium",
      executionStyle: "structured",
      interactionSpeed: "normal",
      emotionalSensitivity: "medium",
      decisionMode: "hybrid",
      confidenceScore: 0.3,
    };
  }

  const profile = response.data;

  // Store profile
  await supabaseAdmin
    .from("cognitive_profiles")
    .upsert(
      {
        user_id: dbUserId,
        modality_bias: profile.modalityBias,
        information_density: profile.informationDensity,
        execution_style: profile.executionStyle,
        interaction_speed: profile.interactionSpeed,
        emotional_sensitivity: profile.emotionalSensitivity,
        decision_mode: profile.decisionMode,
        confidence_score: profile.confidenceScore,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

  return profile;
}

/**
 * Get cognitive profile
 */
export async function getCognitiveProfile(userId: string): Promise<CognitiveProfile | null> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  const { data: profile } = await supabaseAdmin
    .from("cognitive_profiles")
    .select("*")
    .eq("user_id", dbUserId)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  return {
    modalityBias: profile.modality_bias,
    informationDensity: profile.information_density,
    executionStyle: profile.execution_style,
    interactionSpeed: profile.interaction_speed,
    emotionalSensitivity: profile.emotional_sensitivity,
    decisionMode: profile.decision_mode,
    confidenceScore: profile.confidence_score,
  };
}

/**
 * Log interaction event
 */
export async function logInteractionEvent(
  userId: string,
  eventType: string,
  context?: Record<string, any>
): Promise<void> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  await supabaseAdmin.from("interaction_events").insert({
    user_id: dbUserId,
    event_type: eventType,
    context: context || {},
  });
}



