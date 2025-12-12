// Context-Aware Persona Router
// lib/personas/context-router.ts

import { supabaseAdmin } from "@/lib/supabase";
import { PersonaProfile, PersonaDrift, ContextRule } from "./types";
import { getDefaultVoiceForCoach } from "@/lib/voices/registry";
import { getVoiceProfileByKey } from "@/lib/voices/seed";
import { getEvolvedPersona } from "./evolution";

export interface RouterContext {
  coachId: string;
  userEmotion?: {
    primary: string | null;
    intensity?: number;
  } | null;
  currentTime?: Date;
  missionState?: {
    activeMissions: number;
    urgentMissions: number;
  } | null;
  stressScore?: number;
  jobContext?: {
    level: string;
    progressToNext: number;
  } | null;
  userPreferences?: {
    preferred_coach_voice?: Record<string, string | "auto">;
  } | null;
  activeDrift?: PersonaDrift | null;
}

export interface ResolvedPersona {
  persona: PersonaProfile;
  reason: string;
  isDriftApplied: boolean;
  isEvolutionApplied: boolean;
}

/**
 * Resolve persona based on full context
 */
export async function resolvePersona(
  userId: string,
  context: RouterContext
): Promise<ResolvedPersona> {
  // 1. Check user-selected persona override (highest priority)
  const userPreference = context.userPreferences?.preferred_coach_voice?.[context.coachId];
  if (userPreference && userPreference !== "auto") {
    const profile = await getVoiceProfileByKey(userPreference);
    if (profile) {
      return {
        persona: profile as PersonaProfile,
        reason: `User preference: ${profile.name}`,
        isDriftApplied: false,
        isEvolutionApplied: false,
      };
    }
  }

  // 2. Check context rules
  const contextRule = await findMatchingContextRule(context);
  if (contextRule) {
    const { data: profile } = await supabaseAdmin
      .from("voice_profiles")
      .select("*")
      .eq("id", contextRule.persona_id)
      .single();

    if (profile) {
      return {
        persona: profile as PersonaProfile,
        reason: `Context rule: ${contextRule.trigger_type}=${contextRule.trigger_value}`,
        isDriftApplied: false,
        isEvolutionApplied: false,
      };
    }
  }

  // 3. Check emotion OS rules
  if (context.userEmotion?.primary) {
    const emotionVoice = getEmotionDrivenVoice(context.userEmotion.primary);
    if (emotionVoice) {
      const profile = await getVoiceProfileByKey(emotionVoice);
      if (profile) {
        return {
          persona: profile as PersonaProfile,
          reason: `Emotion override: ${context.userEmotion.primary}`,
          isDriftApplied: false,
          isEvolutionApplied: false,
        };
      }
    }
  }

  // 4. Get coach default
  const defaultVoiceKey = await getDefaultVoiceForCoach(context.coachId as any);
  let basePersona = await getVoiceProfileByKey(defaultVoiceKey);

  if (!basePersona) {
    // Fallback
    basePersona = await getVoiceProfileByKey("friendly_butler");
    if (!basePersona) {
      throw new Error("No persona available");
    }
  }

  // 5. Apply evolution stage modifier
  let evolvedPersona: PersonaProfile | null = null;
  if (context.jobContext) {
    try {
      evolvedPersona = await getEvolvedPersona(userId, defaultVoiceKey, {
        careerLevel: context.jobContext.level,
      });
    } catch (err) {
      console.warn("[ContextRouter] Evolution failed:", err);
    }
  }

  const activePersona = evolvedPersona || (basePersona as PersonaProfile);

  // 6. Apply persona drift if active
  let finalPersona = activePersona;
  let isDriftApplied = false;

  if (context.activeDrift) {
    finalPersona = applyDrift(activePersona, context.activeDrift);
    isDriftApplied = true;
  }

  return {
    persona: finalPersona,
    reason: evolvedPersona
      ? `Evolved ${basePersona.name} (${context.jobContext?.level || "base"})`
      : `Default: ${basePersona.name}`,
    isDriftApplied,
    isEvolutionApplied: !!evolvedPersona,
  };
}

/**
 * Find matching context rule
 */
async function findMatchingContextRule(
  context: RouterContext
): Promise<ContextRule | null> {
  const rules: ContextRule[] = [];

  // Check emotion rules
  if (context.userEmotion?.primary) {
    const { data: emotionRules } = await supabaseAdmin
      .from("persona_context_rules")
      .select("*")
      .eq("trigger_type", "emotion")
      .eq("trigger_value", context.userEmotion.primary.toLowerCase())
      .or(`coach_id.is.null,coach_id.eq.${context.coachId}`)
      .order("priority", { ascending: false });

    if (emotionRules) {
      rules.push(...(emotionRules as any));
    }
  }

  // Check time rules
  if (context.currentTime) {
    const hour = context.currentTime.getHours();
    let timeValue = "";
    if (hour >= 22 || hour < 6) timeValue = "late_night";
    else if (hour >= 6 && hour < 10) timeValue = "morning";
    else if (hour >= 10 && hour < 14) timeValue = "midday";
    else if (hour >= 14 && hour < 18) timeValue = "afternoon";
    else if (hour >= 18 && hour < 22) timeValue = "evening";

    if (timeValue) {
      const { data: timeRules } = await supabaseAdmin
        .from("persona_context_rules")
        .select("*")
        .eq("trigger_type", "time")
        .eq("trigger_value", timeValue)
        .or(`coach_id.is.null,coach_id.eq.${context.coachId}`)
        .order("priority", { ascending: false });

      if (timeRules) {
        rules.push(...(timeRules as any));
      }
    }
  }

  // Check mission rules
  if (context.missionState?.urgentMissions && context.missionState.urgentMissions > 0) {
    const { data: missionRules } = await supabaseAdmin
      .from("persona_context_rules")
      .select("*")
      .eq("trigger_type", "mission")
      .eq("trigger_value", "urgent")
      .or(`coach_id.is.null,coach_id.eq.${context.coachId}`)
      .order("priority", { ascending: false });

    if (missionRules) {
      rules.push(...(missionRules as any));
    }
  }

  // Check stress rules
  if (context.stressScore && context.stressScore > 0.7) {
    const { data: stressRules } = await supabaseAdmin
      .from("persona_context_rules")
      .select("*")
      .eq("trigger_type", "stress")
      .eq("trigger_value", "high")
      .or(`coach_id.is.null,coach_id.eq.${context.coachId}`)
      .order("priority", { ascending: false });

    if (stressRules) {
      rules.push(...(stressRules as any));
    }
  }

  // Return highest priority rule
  if (rules.length > 0) {
    return rules.sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];
  }

  return null;
}

/**
 * Get emotion-driven voice (from registry)
 */
function getEmotionDrivenVoice(emotion: string): string | null {
  const emotionMap: Record<string, string> = {
    stressed: "zen_therapist",
    overwhelmed: "zen_therapist",
    anxious: "zen_therapist",
    hyped: "hype_warrior",
    depressed: "zen_therapist",
    angry: "analytical_guide",
  };

  return emotionMap[emotion.toLowerCase()] || null;
}

/**
 * Apply persona drift
 */
function applyDrift(
  persona: PersonaProfile,
  drift: PersonaDrift
): PersonaProfile {
  const adjusted = { ...persona };
  const style = { ...persona.style };

  // Apply drift adjustments
  if (drift.adjustments.energy !== undefined) {
    style.energy = Math.max(0, Math.min(100, style.energy + drift.adjustments.energy));
  }
  if (drift.adjustments.warmth !== undefined) {
    style.warmth = Math.max(0, Math.min(100, style.warmth + drift.adjustments.warmth));
  }
  if (drift.adjustments.decisiveness !== undefined) {
    style.decisiveness = Math.max(0, Math.min(100, style.decisiveness + drift.adjustments.decisiveness));
  }
  if (drift.adjustments.pacing) {
    style.pacing = drift.adjustments.pacing;
  }

  adjusted.style = style;
  return adjusted;
}

/**
 * Calculate persona drift based on context
 */
export function calculateDrift(context: RouterContext): PersonaDrift | null {
  const adjustments: Partial<ToneMatrix> = {};

  // Emotional volatility
  if (context.userEmotion?.intensity && context.userEmotion.intensity > 0.8) {
    adjustments.energy = 15;
    adjustments.warmth = -10;
  }

  // High stress
  if (context.stressScore && context.stressScore > 0.7) {
    adjustments.warmth = 20;
    adjustments.energy = -15;
    adjustments.pacing = "slow";
  }

  // Urgent missions
  if (context.missionState?.urgentMissions && context.missionState.urgentMissions > 3) {
    adjustments.energy = 10;
    adjustments.decisiveness = 15;
  }

  if (Object.keys(adjustments).length === 0) {
    return null;
  }

  return {
    adjustments,
    decayRate: 0.1, // 10% per hour
    appliedAt: new Date(),
  };
}




