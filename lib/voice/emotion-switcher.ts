// Emotion-Aware Voice Switching
// lib/voice/emotion-switcher.ts

import { getCoachPersona } from "./personas/coach-voice-personas";
import { getCurrentEmotionState } from "@/lib/emotion-os/server";
import { supabaseAdmin } from "@/lib/supabase";

export interface ActiveVoiceProfile {
  voiceId: string;          // Voice profile key
  speed: number;
  energy: number;
  warmth: number;
  temporary: boolean;       // True if this is an emotion override
  emotion?: string | null;  // Detected emotion that triggered override
  reason?: string;          // Why this voice was selected
}

/**
 * Find user's voice override for a specific coach + emotion
 * Used for custom user-defined overrides
 */
async function findVoiceOverride(
  userId: string,
  coachId: string,
  emotion: string
): Promise<{ override_voice: string; speed_override?: number; energy_override?: number; warmth_override?: number } | null> {
  try {
    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    const { data: override } = await supabaseAdmin
      .from("voice_emotion_overrides")
      .select("override_voice, speed_override, energy_override, warmth_override")
      .eq("user_id", dbUserId)
      .eq("coach_id", coachId)
      .eq("emotion", emotion.toLowerCase())
      .eq("is_active", true)
      .maybeSingle();

    return override || null;
  } catch (err) {
    console.warn("[EmotionSwitcher] Failed to find override:", err);
    return null;
  }
}

/**
 * Log voice switch event for analytics
 * Exported for use in voice router and other systems
 */
async function logVoiceSwitchEvent(params: {
  userId: string;
  coachId: string;
  baseVoice: string;
  finalVoice: string;
  emotion?: string | null;
  temporary: boolean;
}): Promise<void> {
  try {
    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", params.userId)
      .maybeSingle();

    const dbUserId = userRow?.id || params.userId;

    await supabaseAdmin.from("voice_switch_events").insert({
      user_id: dbUserId,
      coach_id: params.coachId,
      base_voice: params.baseVoice,
      final_voice: params.finalVoice,
      primary_emotion: params.emotion || null,
      temporary: params.temporary,
    });
  } catch (err) {
    // Non-critical, just log warning
    console.warn("[EmotionSwitcher] Failed to log switch event:", err);
  }
}

/**
 * Get dynamic voice profile based on coach persona and current emotion
 */
export async function getDynamicVoiceProfile(
  userId: string,
  coachId: string,
  userInput?: string
): Promise<ActiveVoiceProfile> {
  // 1. Get baseline persona
  const persona = getCoachPersona(coachId);
  if (!persona) {
    // Fallback to default if coach not found
    return {
      voiceId: "friendly_butler", // Fixed: was "pulse_default"
      speed: 1.0,
      energy: 0.55,
      warmth: 0.85,
      temporary: false,
      reason: "Unknown coach, using default voice",
    };
  }

  // 2. Start with persona baseline
  let profile: ActiveVoiceProfile = {
    voiceId: persona.baseVoiceId,
    speed: persona.speakingStyle.speed,
    energy: persona.speakingStyle.energy,
    warmth: persona.speakingStyle.warmth,
    temporary: false,
    reason: `Using ${persona.displayName} default voice`,
  };

  // 3. Check for user-defined emotion overrides first
  if (userInput) {
    const inputLower = userInput.toLowerCase();
    const stressKeywords = ["overwhelmed", "stressed", "anxious", "can't handle", "too much", "falling apart"];
    const sadKeywords = ["sad", "depressed", "down", "hopeless", "feeling low"];
    const angryKeywords = ["angry", "frustrated", "pissed", "annoyed", "hate"];
    const hypeKeywords = ["let's go", "pumped", "excited", "ready", "dialed in", "fired up"];

    // Check for user-defined override
    if (stressKeywords.some(kw => inputLower.includes(kw))) {
      const override = await findVoiceOverride(userId, coachId, "stressed");
      if (override) {
        return {
          voiceId: override.override_voice,
          speed: override.speed_override || 0.8,
          energy: override.energy_override || 0.2,
          warmth: override.warmth_override || 1.0,
          temporary: true,
          emotion: "stressed",
          reason: "User-defined override for stress",
        };
      }
    }
  }

  // 4. Check Emotion OS for current state
  try {
    const emotionState = await getCurrentEmotionState(userId);
    
    if (emotionState) {
      const primaryEmotion = emotionState.detected_emotion?.toLowerCase();
      const intensity = emotionState.intensity || 0;
      
      // Check for user-defined override for this emotion
      if (primaryEmotion) {
        const override = await findVoiceOverride(userId, coachId, primaryEmotion);
        if (override && intensity >= 0.6) {
          return {
            voiceId: override.override_voice,
            speed: override.speed_override || profile.speed,
            energy: override.energy_override || profile.energy,
            warmth: override.warmth_override || profile.warmth,
            temporary: true,
            emotion: primaryEmotion,
            reason: `User-defined override for ${primaryEmotion}`,
          };
        }
      }

      // Only override if intensity is significant (>= 0.6) and no user override found
      if (intensity >= 0.6) {
        switch (primaryEmotion) {
          case "stress":
          case "stressed":
          case "anxious":
          case "overwhelmed":
            profile = {
              voiceId: "zen_therapist", // Fixed: was "calm_therapist"
              speed: 0.8,
              energy: 0.2,
              warmth: 1.0,
              temporary: true,
              emotion: primaryEmotion,
              reason: "Detected stress/anxiety - switching to calming voice",
            };
            break;

          case "sad":
          case "sadness":
          case "depressed":
          case "down":
            profile = {
              voiceId: "zen_therapist", // Fixed: was "calm_therapist"
              speed: 0.75,
              energy: 0.1,
              warmth: 1.0,
              temporary: true,
              emotion: primaryEmotion,
              reason: "Detected sadness - using supportive, gentle voice",
            };
            break;

          case "angry":
          case "anger":
          case "frustrated":
          case "irritated":
            profile = {
              voiceId: "analytical_guide", // Fixed: was "pulse_default" - use de-escalation voice
              speed: 0.95,
              energy: 0.5,
              warmth: 0.5,
              temporary: true,
              emotion: primaryEmotion,
              reason: "Detected anger - using neutral, balanced voice",
            };
            break;

          case "hype":
          case "excited":
          case "energetic":
          case "motivated":
            profile = {
              voiceId: "hype_warrior", // Fixed: was "hype_coach"
              speed: 1.3,
              energy: 1.0,
              warmth: 0.4,
              temporary: true,
              emotion: primaryEmotion,
              reason: "Detected high energy - matching with hype voice",
            };
            break;

          case "calm":
          case "peaceful":
          case "relaxed":
            // Keep persona but adjust to be even calmer
            profile = {
              voiceId: persona.baseVoiceId,
              speed: Math.max(0.8, persona.speakingStyle.speed * 0.9),
              energy: Math.max(0.2, persona.speakingStyle.energy * 0.7),
              warmth: Math.min(1.0, persona.speakingStyle.warmth * 1.1),
              temporary: true,
              emotion: primaryEmotion,
              reason: "Detected calm state - enhancing warmth",
            };
            break;

          default:
            // Keep persona default
            break;
        }
      }
    }
  } catch (err) {
    console.warn("[EmotionSwitcher] Failed to get emotion state, using persona default:", err);
  }

  // 5. Log the voice switch for analytics (non-blocking)
  if (profile.temporary && profile.emotion) {
    logVoiceSwitchEvent({
      userId,
      coachId,
      baseVoice: persona.baseVoiceId,
      finalVoice: profile.voiceId,
      emotion: profile.emotion,
      temporary: true,
    }).catch(() => {
      // Non-critical, ignore errors
    });
  }

  return profile;
}

/**
 * Get voice profile for a specific coach without emotion overrides
 */
export function getCoachPersonaVoice(coachId: string): ActiveVoiceProfile | null {
  const persona = getCoachPersona(coachId);
  if (!persona) return null;

  return {
    voiceId: persona.baseVoiceId,
    speed: persona.speakingStyle.speed,
    energy: persona.speakingStyle.energy,
    warmth: persona.speakingStyle.warmth,
    temporary: false,
    reason: `${persona.displayName} default voice`,
  };
}

