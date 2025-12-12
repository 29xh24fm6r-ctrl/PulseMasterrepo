// User Safety Preferences
// lib/safety/user-preferences.ts

import { supabaseAdmin } from "@/lib/supabase";
import { UserSafetySettings } from "./types";
import { PersonaProfile } from "@/lib/personas/types";

/**
 * Get user safety settings
 */
export async function getUserSafetySettings(
  userId: string
): Promise<UserSafetySettings | null> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  const { data } = await supabaseAdmin
    .from("user_safety_settings")
    .select("*")
    .eq("user_id", dbUserId)
    .maybeSingle();

  if (!data) {
    // Create default settings
    const { data: newSettings } = await supabaseAdmin
      .from("user_safety_settings")
      .insert({
        user_id: dbUserId,
        allow_mature_but_nonsexual: false,
        allow_direct_language: true,
        tone_sensitivity: "normal",
      })
      .select("*")
      .single();

    return newSettings as UserSafetySettings;
  }

  return data as UserSafetySettings;
}

/**
 * Apply user safety preferences to persona
 */
export function applyUserSafetyPreferencesToPersona(
  persona: PersonaProfile,
  settings: UserSafetySettings
): PersonaProfile {
  const adjusted = { ...persona };
  const style = { ...persona.style };

  // Tone sensitivity adjustments
  if (settings.tone_sensitivity === "high") {
    // Reduce harshness, increase warmth
    style.warmth = Math.min(100, style.warmth + 15);
    style.energy = Math.max(0, style.energy - 10);
    style.directiveness = Math.max(0, style.directiveness - 15);
  } else if (settings.tone_sensitivity === "low") {
    // Allow more directness
    style.directiveness = Math.min(100, style.directiveness + 10);
  }

  // Direct language preference
  if (!settings.allow_direct_language) {
    // Soften directiveness
    style.directiveness = Math.max(0, style.directiveness - 20);
    style.warmth = Math.min(100, style.warmth + 10);
  }

  adjusted.style = style;
  return adjusted;
}




