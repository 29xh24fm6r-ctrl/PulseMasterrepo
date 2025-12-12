// Intervention Outcome Logger
// lib/cortex/sovereign/meta-learning/logger.ts

import { supabaseAdmin } from "@/lib/supabase";
import { InterventionRecord } from "./types";
import { PulseCortexContext } from "@/lib/cortex/types";
import { v4 as uuidv4 } from "uuid";

/**
 * Log intervention when shown
 */
export async function logInterventionShown(
  userId: string,
  interventionType: string,
  domain: string,
  ctx: PulseCortexContext
): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  const interventionId = uuidv4();

  // Create shallow context snapshot
  const contextSnapshot = {
    emotion: ctx.emotion?.detected_emotion,
    energy: ctx.cognitiveProfile.currentEnergyLevel,
    xp: ctx.xp.totalXP,
    timestamp: ctx.timestamp,
  };

  const { error } = await supabaseAdmin.from("intervention_outcomes").insert({
    id: interventionId,
    user_id: dbUserId,
    intervention_type: interventionType,
    domain: domain,
    context_snapshot: contextSnapshot,
    acted_on: false,
  });

  if (error) {
    console.error("[Meta-Learning] Failed to log intervention:", error);
  }

  return interventionId;
}

/**
 * Update intervention outcome
 */
export async function updateInterventionOutcome(
  interventionId: string,
  outcome: {
    actedOn: boolean;
    timeToActionMinutes?: number;
    xpDelta?: number;
    moodDelta?: number;
    streakImpact?: number;
    userFeedback?: "positive" | "neutral" | "negative";
  }
): Promise<void> {
  const updateData: any = {
    acted_on: outcome.actedOn,
  };

  if (outcome.timeToActionMinutes !== undefined) {
    updateData.time_to_action_minutes = outcome.timeToActionMinutes;
  }
  if (outcome.xpDelta !== undefined) {
    updateData.xp_delta = outcome.xpDelta;
  }
  if (outcome.moodDelta !== undefined) {
    updateData.mood_delta = outcome.moodDelta;
  }
  if (outcome.streakImpact !== undefined) {
    updateData.streak_impact = outcome.streakImpact;
  }
  if (outcome.userFeedback) {
    updateData.user_feedback = outcome.userFeedback;
  }

  const { error } = await supabaseAdmin
    .from("intervention_outcomes")
    .update(updateData)
    .eq("id", interventionId);

  if (error) {
    console.error("[Meta-Learning] Failed to update intervention outcome:", error);
  }
}

/**
 * Record user feedback on intervention
 */
export async function recordUserFeedback(
  interventionId: string,
  feedback: "positive" | "neutral" | "negative"
): Promise<void> {
  await updateInterventionOutcome(interventionId, { userFeedback: feedback });
}



