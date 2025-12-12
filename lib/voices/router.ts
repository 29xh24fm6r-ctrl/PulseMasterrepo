// Voice Router - Resolves voice profile based on context
// lib/voices/router.ts

import { supabaseAdmin } from "@/lib/supabase";
import { getDefaultVoiceForCoach, getEmotionDrivenVoice, CoachId } from "./registry";
import { getVoiceProfileByKey, VOICE_ARCHETYPES } from "./seed";

export interface VoiceResolutionContext {
  coachId: CoachId;
  userEmotion?: {
    primary: string | null;
    intensity?: number;
  } | null;
  userSettings?: {
    preferred_coach_voice?: Record<string, string | "auto">;
  } | null;
  careerContext?: {
    level: string;
    progressToNext: number;
    recentPromotion: boolean;
  } | null;
  roleplayContext?: {
    voice_style?: string;
    character_type?: string;
  } | null;
}

import { VoiceProfile } from "./seed";

export interface ResolvedVoice {
  profileKey: string;
  profile: VoiceProfile;
  reason: string;
  isEmotionOverride: boolean;
  isCareerAdjusted: boolean;
}

/**
 * Resolve voice profile for a coach interaction
 */
export async function resolveVoice(
  context: VoiceResolutionContext
): Promise<ResolvedVoice> {
  const { coachId, userEmotion, userSettings, careerContext, roleplayContext } =
    context;

  // 1. Check user's explicit preference
  const userPreference = userSettings?.preferred_coach_voice?.[coachId];

  if (userPreference && userPreference !== "auto") {
    // User has set a specific voice for this coach
    // First try to get from database
    let profile = await getVoiceProfileByKey(userPreference);
    
    // If not in DB, check archetypes (for backward compatibility)
    if (!profile) {
      profile = VOICE_ARCHETYPES.find((a) => a.key === userPreference) || null;
    }
    
    if (profile) {
      return {
        profileKey: userPreference,
        profile,
        reason: `User preference: ${profile.name}`,
        isEmotionOverride: false,
        isCareerAdjusted: false,
      };
    }
  }

  // 2. Check roleplay context (highest priority for roleplay coach)
  if (coachId === "roleplay" && roleplayContext?.voice_style) {
    const roleplayVoice = await getVoiceProfileByKey(roleplayContext.voice_style);
    if (roleplayVoice) {
      return {
        profileKey: roleplayContext.voice_style,
        profile: roleplayVoice,
        reason: `Roleplay character: ${roleplayContext.character_type || "character"}`,
        isEmotionOverride: false,
        isCareerAdjusted: false,
      };
    }
  }

  // 3. Check emotion-driven override (if user preference is "auto" or not set)
  if (userPreference === "auto" || !userPreference) {
    if (userEmotion?.primary) {
      const emotionVoice = getEmotionDrivenVoice(
        userEmotion.primary,
        userEmotion.intensity
      );

      if (emotionVoice) {
        const profile = await getVoiceProfileByKey(emotionVoice);
        if (profile) {
          return {
            profileKey: emotionVoice,
            profile,
            reason: `Emotion override: ${userEmotion.primary} → ${profile.name}`,
            isEmotionOverride: true,
            isCareerAdjusted: false,
          };
        }
      }
    }
  }

  // 4. Get coach default
  const defaultVoiceKey = await getDefaultVoiceForCoach(coachId);
  let profile = await getVoiceProfileByKey(defaultVoiceKey);

  if (!profile) {
    // Fallback to friendly butler
    profile = await getVoiceProfileByKey("friendly_butler");
    if (!profile) {
      throw new Error("No voice profiles available");
    }
  }

  // 5. Apply career context adjustments
  const adjustedProfile = { ...profile };
  let isCareerAdjusted = false;
  let reason = `Default: ${profile.name}`;

  if (careerContext) {
    const { level, recentPromotion } = careerContext;

    if (recentPromotion) {
      // Boost energy for promotions
      adjustedProfile.style.energy = Math.min(100, profile.style.energy + 20);
      adjustedProfile.default_energy = Math.min(100, profile.default_energy + 20);
      isCareerAdjusted = true;
      reason += " (promotion boost)";
    }

    // Adjust based on level
    if (level === "rookie") {
      // More reassurance, higher warmth
      adjustedProfile.style.warmth = Math.min(100, profile.style.warmth + 15);
      adjustedProfile.style.energy = Math.min(100, profile.style.energy + 10);
      isCareerAdjusted = true;
      reason += " (rookie support)";
    } else if (level === "elite" || level === "legend") {
      // More strategic, efficient tone
      adjustedProfile.style.decisiveness = Math.min(100, profile.style.decisiveness + 10);
      adjustedProfile.style.pacing = "normal";
      isCareerAdjusted = true;
      reason += " (elite efficiency)";
    }
  }

  return {
    profileKey: defaultVoiceKey,
    profile: adjustedProfile,
    reason,
    isEmotionOverride: false,
    isCareerAdjusted,
  };
}

