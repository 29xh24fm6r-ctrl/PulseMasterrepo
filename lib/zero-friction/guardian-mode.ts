// Guardian Mode (Anti-Overwhelm AI) - Experience Ω
// lib/zero-friction/guardian-mode.ts

import { supabaseAdmin } from "@/lib/supabase";
import { getWorkCortexContextForUser } from "@/lib/cortex/context";
import { getCognitiveProfile } from "./cognitive-profile";

export interface GuardianState {
  isActive: boolean;
  activatedAt?: string;
  activationReason?: string;
  simplifiedInterfaceEnabled: boolean;
  notificationsPaused: boolean;
  coachToneOverride?: string;
}

/**
 * Check if Guardian Mode should activate
 */
export async function checkGuardianMode(userId: string): Promise<GuardianState> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  // Get current state
  const ctx = await getWorkCortexContextForUser(userId);
  const profile = await getCognitiveProfile(userId);

  // Get recent interaction events
  const { data: events } = await supabaseAdmin
    .from("interaction_events")
    .select("*")
    .eq("user_id", dbUserId)
    .order("timestamp", { ascending: false })
    .limit(20);

  // Check activation signals
  const stress = ctx.emotion?.intensity || 0;
  const emotion = ctx.emotion?.detected_emotion || "neutral";
  const backNavCount = events?.filter((e) => e.event_type === "back_navigation").length || 0;
  const screenSwitchCount = events?.filter((e) => e.event_type === "screen_switch").length || 0;
  const hesitationCount = events?.filter((e) => e.event_type === "hesitation").length || 0;

  // Determine if Guardian should activate
  let shouldActivate = false;
  let reason = "";

  if (stress > 0.7 || emotion === "stressed" || emotion === "overwhelmed") {
    shouldActivate = true;
    reason = "High stress detected";
  } else if (backNavCount > 3) {
    shouldActivate = true;
    reason = "Multiple back navigations (confusion signal)";
  } else if (screenSwitchCount > 5) {
    shouldActivate = true;
    reason = "Rapid screen switching (overwhelm signal)";
  } else if (hesitationCount > 4) {
    shouldActivate = true;
    reason = "Multiple hesitations (uncertainty signal)";
  } else if (profile?.emotionalSensitivity === "high" && stress > 0.5) {
    shouldActivate = true;
    reason = "High emotional sensitivity + moderate stress";
  }

  // Get existing guardian state
  const { data: existingState } = await supabaseAdmin
    .from("guardian_state")
    .select("*")
    .eq("user_id", dbUserId)
    .maybeSingle();

  const wasActive = existingState?.is_active || false;

  // Update state
  const guardianState: GuardianState = {
    isActive: shouldActivate,
    activatedAt: shouldActivate && !wasActive ? new Date().toISOString() : existingState?.activated_at,
    activationReason: shouldActivate ? reason : undefined,
    simplifiedInterfaceEnabled: shouldActivate,
    notificationsPaused: shouldActivate,
    coachToneOverride: shouldActivate ? "gentle" : undefined,
  };

  await supabaseAdmin
    .from("guardian_state")
    .upsert(
      {
        user_id: dbUserId,
        is_active: shouldActivate,
        activated_at: guardianState.activatedAt,
        activation_reason: guardianState.activationReason,
        simplified_interface_enabled: guardianState.simplifiedInterfaceEnabled,
        notifications_paused: guardianState.notificationsPaused,
        coach_tone_override: guardianState.coachToneOverride,
      },
      {
        onConflict: "user_id",
      }
    );

  return guardianState;
}

/**
 * Get current Guardian state
 */
export async function getGuardianState(userId: string): Promise<GuardianState> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  const { data: state } = await supabaseAdmin
    .from("guardian_state")
    .select("*")
    .eq("user_id", dbUserId)
    .maybeSingle();

  if (!state) {
    return {
      isActive: false,
      simplifiedInterfaceEnabled: false,
      notificationsPaused: false,
    };
  }

  return {
    isActive: state.is_active,
    activatedAt: state.activated_at,
    activationReason: state.activation_reason,
    simplifiedInterfaceEnabled: state.simplified_interface_enabled,
    notificationsPaused: state.notifications_paused,
    coachToneOverride: state.coach_tone_override,
  };
}



