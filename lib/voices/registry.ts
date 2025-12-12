// Voice Registry - Coach to Voice Mappings
// lib/voices/registry.ts

import { getVoiceProfileByKey } from "./seed";
import { supabaseAdmin } from "@/lib/supabase";

export type CoachId =
  | "sales"
  | "confidant"
  | "career"
  | "philosophy"
  | "emotional"
  | "autopilot"
  | "roleplay"
  | "general";

/**
 * Default coach → voice persona mapping
 */
export const DEFAULT_COACH_VOICE_MAP: Record<CoachId, string> = {
  sales: "hype_warrior",
  confidant: "zen_therapist",
  career: "executive_strategist",
  philosophy: "samurai_mentor",
  emotional: "zen_therapist",
  autopilot: "executive_strategist",
  roleplay: "friendly_butler", // Dynamic based on context
  general: "friendly_butler",
};

/**
 * Get default voice profile for a coach
 */
export async function getDefaultVoiceForCoach(
  coachId: CoachId
): Promise<string> {
  // Check for coach override
  const { data: override } = await supabaseAdmin
    .from("coach_voice_overrides")
    .select("voice_profiles(key)")
    .eq("coach_id", coachId)
    .maybeSingle();

  if (override && override.voice_profiles && typeof override.voice_profiles === 'object' && 'key' in override.voice_profiles) {
    return (override.voice_profiles as { key: string }).key;
  }

  return DEFAULT_COACH_VOICE_MAP[coachId] || "friendly_butler";
}

/**
 * Emotion → Voice Override Mapping
 */
export const EMOTION_VOICE_OVERRIDES: Record<string, string> = {
  stressed: "zen_therapist",
  overwhelmed: "zen_therapist",
  anxious: "zen_therapist",
  hyped: "hype_warrior",
  depressed: "zen_therapist",
  angry: "analytical_guide", // De-escalate
  calm: null, // Use coach default
};

/**
 * Get emotion-driven voice override
 */
export function getEmotionDrivenVoice(
  emotion: string | null,
  intensity: number = 0.5
): string | null {
  if (!emotion) return null;

  const normalizedEmotion = emotion.toLowerCase();
  const override = EMOTION_VOICE_OVERRIDES[normalizedEmotion];

  // For high-intensity emotions, force override
  if (intensity > 0.7 && override) {
    return override;
  }

  return override || null;
}

