// XP Hooks for Executive Function Actions
// lib/productivity/xp-hooks.ts

import { supabaseAdmin } from "@/lib/supabase";

/**
 * Award XP for following Pulse's planned block
 */
export async function awardXPForPlannedBlock(
  userId: string,
  blockId: string,
  completedItems: number,
  totalItems: number
): Promise<number> {
  const completionRate = totalItems > 0 ? completedItems / totalItems : 0;
  
  // Base XP: 15 per completed item
  let xp = completedItems * 15;
  
  // Completion bonus: +30 if 80%+ completion
  if (completionRate >= 0.8) {
    xp += 30;
  }
  
  // Perfect completion bonus: +50 if 100%
  if (completionRate === 1.0) {
    xp += 50;
  }

  await awardXP(userId, xp, "discipline", "planned_block_completed", blockId);
  return xp;
}

/**
 * Award XP for completing micro-steps
 */
export async function awardXPForMicroStep(
  userId: string,
  stepId: string,
  parentTaskId: string
): Promise<number> {
  const xp = 5; // Small reward for each micro-step
  await awardXP(userId, xp, "discipline", "micro_step_completed", stepId);
  return xp;
}

/**
 * Award XP for staying inside a focus session
 */
export async function awardXPForFocusSession(
  userId: string,
  sessionId: string,
  durationMinutes: number,
  completedItems: number
): Promise<number> {
  // Base XP: 10 per completed item
  let xp = completedItems * 10;
  
  // Duration bonus: +1 XP per minute (capped at 60)
  xp += Math.min(60, durationMinutes);
  
  // Focus bonus: +20 if session was 25+ minutes
  if (durationMinutes >= 25) {
    xp += 20;
  }

  await awardXP(userId, xp, "discipline", "focus_session_completed", sessionId);
  return xp;
}

/**
 * Award XP for successfully finishing an EF-generated sequence
 */
export async function awardXPForEFSequence(
  userId: string,
  sequenceId: string,
  completedCount: number,
  totalCount: number
): Promise<number> {
  const completionRate = totalCount > 0 ? completedCount / totalCount : 0;
  
  // Base XP: 20 per completed item
  let xp = completedCount * 20;
  
  // Sequence completion bonus
  if (completionRate >= 0.9) {
    xp += 50; // High completion bonus
  } else if (completionRate >= 0.7) {
    xp += 30; // Medium completion bonus
  }

  await awardXP(userId, xp, "discipline", "ef_sequence_completed", sequenceId);
  return xp;
}

/**
 * Internal helper to award XP
 */
async function awardXP(
  userId: string,
  amount: number,
  category: string,
  source: string,
  sourceId: string
): Promise<void> {
  try {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    await supabaseAdmin.from("xp_transactions").insert({
      user_id: dbUserId,
      amount,
      category,
      source,
      source_id: sourceId,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[XP Hooks] Failed to award XP:", err);
  }
}



