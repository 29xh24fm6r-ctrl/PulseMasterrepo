// Progressive Autonomy Engine - Experience Ω
// lib/zero-friction/progressive-autonomy.ts

import { supabaseAdmin } from "@/lib/supabase";
import { buildPulseCortexContext } from "@/lib/cortex/context";

export type AutonomyLevel = 0 | 1 | 2 | 3 | 4;

export interface AutonomyState {
  currentLevel: AutonomyLevel;
  lastLevelChange?: string;
  levelChangeReason?: string;
}

/**
 * Get current autonomy level
 */
export async function getAutonomyLevel(userId: string): Promise<AutonomyState> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  const { data: state } = await supabaseAdmin
    .from("autonomy_state")
    .select("*")
    .eq("user_id", dbUserId)
    .maybeSingle();

  if (!state) {
    // Initialize at level 0
    await supabaseAdmin.from("autonomy_state").insert({
      user_id: dbUserId,
      current_level: 0,
    });

    return {
      currentLevel: 0,
    };
  }

  return {
    currentLevel: state.current_level,
    lastLevelChange: state.last_level_change,
    levelChangeReason: state.level_change_reason,
  };
}

/**
 * Evaluate and potentially upgrade autonomy level
 */
export async function evaluateAutonomyLevel(userId: string): Promise<AutonomyState> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  const currentState = await getAutonomyLevel(userId);
  const currentLevel = currentState.currentLevel;

  // Get user context
  const ctx = await buildPulseCortexContext(userId);

  // Get interaction events
  const { data: events } = await supabaseAdmin
    .from("interaction_events")
    .select("*")
    .eq("user_id", dbUserId)
    .order("timestamp", { ascending: false })
    .limit(50);

  // Analyze patterns
  const frustrationSignals =
    events?.filter((e) => e.event_type === "back_navigation" || e.event_type === "hesitation")
      .length || 0;
  const completionRate = 0.7; // Would calculate from actual task completions
  const acceptanceRate = 0.8; // Would calculate from accepted suggestions

  // Determine if level should change
  let newLevel: AutonomyLevel = currentLevel;
  let reason = "";

  if (currentLevel === 0) {
    // Move to level 1 if user has been active
    if ((events?.length || 0) > 10) {
      newLevel = 1;
      reason = "User has been active, moving to assist mode";
    }
  } else if (currentLevel === 1) {
    // Move to level 2 if user accepts suggestions
    if (acceptanceRate > 0.7 && frustrationSignals < 3) {
      newLevel = 2;
      reason = "User accepts suggestions, moving to guided mode";
    }
  } else if (currentLevel === 2) {
    // Move to level 3 if user consistently accepts
    if (acceptanceRate > 0.8 && completionRate > 0.7) {
      newLevel = 3;
      reason = "User consistently accepts, moving to auto mode";
    }
  } else if (currentLevel === 3) {
    // Move to level 4 if user trusts Pulse completely
    if (acceptanceRate > 0.9 && frustrationSignals === 0) {
      newLevel = 4;
      reason = "User fully trusts Pulse, moving to true autopilot";
    }
  }

  // Downgrade if frustration is high
  if (frustrationSignals > 5 && currentLevel > 1) {
    newLevel = Math.max(1, currentLevel - 1) as AutonomyLevel;
    reason = "High frustration detected, reducing autonomy";
  }

  // Update if level changed
  if (newLevel !== currentLevel) {
    await supabaseAdmin
      .from("autonomy_state")
      .upsert(
        {
          user_id: dbUserId,
          current_level: newLevel,
          last_level_change: new Date().toISOString(),
          level_change_reason: reason,
        },
        {
          onConflict: "user_id",
        }
      );
  }

  return {
    currentLevel: newLevel,
    lastLevelChange: new Date().toISOString(),
    levelChangeReason: reason,
  };
}



