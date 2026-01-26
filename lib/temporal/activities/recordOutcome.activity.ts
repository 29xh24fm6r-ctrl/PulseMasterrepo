// lib/temporal/activities/recordOutcome.activity.ts
// Activity: recordOutcome
// SPEC: This activity must succeed. Retry until written.

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { RecordOutcomeInput, RecordOutcomeOutput, OutcomeType } from "../workflows/types";
import { randomUUID } from "crypto";

/**
 * Record the outcome of a workflow execution
 *
 * SPEC RULES:
 * - Must succeed - retry until written
 * - Links confidence predictions to actual outcomes
 * - Enables calibration updates
 *
 * Outcomes close the trust loop:
 * prediction → execution → outcome → calibration → autonomy
 */
export async function recordOutcomeActivity(
  input: RecordOutcomeInput
): Promise<RecordOutcomeOutput> {
  const { userId, sessionId, draftId, confidenceEventIds, outcomeType, notes } = input;
  const supabase = getSupabaseAdmin();
  const outcomeId = randomUUID();
  const measuredAt = new Date().toISOString();

  // 1. Record the outcome
  const { error: outcomeError } = await supabase.from("pulse_outcomes").insert({
    id: outcomeId,
    user_id: userId,
    draft_id: draftId || null,
    outcome_type: outcomeType,
    outcome_signal: {
      sessionId,
      automated: true,
      notes: notes || null,
    },
    measured_at: measuredAt,
    created_at: measuredAt,
  });

  if (outcomeError) {
    console.error("[recordOutcome] Failed to insert outcome:", outcomeError);
    throw outcomeError; // Temporal will retry
  }

  // 2. Update confidence events with outcome
  if (confidenceEventIds.length > 0) {
    const actualOutcome = mapOutcomeTypeToNumeric(outcomeType);

    for (const eventId of confidenceEventIds) {
      const { error: updateError } = await supabase
        .from("pulse_confidence_events")
        .update({
          actual_outcome: actualOutcome,
          outcome_measured_at: measuredAt,
        })
        .eq("id", eventId);

      if (updateError) {
        console.warn("[recordOutcome] Failed to update confidence event:", eventId, updateError);
        // Don't throw - outcome is already recorded
      }
    }
  }

  // 3. Emit observer event
  await supabase.from("pulse_observer_events").insert({
    user_id: userId,
    event_type: "outcome_recorded",
    payload: {
      outcomeId,
      outcomeType,
      sessionId,
      draftId,
      confidenceEventIds,
    },
    created_at: measuredAt,
  });

  return {
    recorded: true,
    outcomeId,
  };
}

/**
 * Map outcome type to numeric value for calibration
 * 1.0 = full success, 0.0 = failure
 */
function mapOutcomeTypeToNumeric(outcomeType: OutcomeType): number {
  switch (outcomeType) {
    case "success":
      return 1.0;
    case "success_after_timeout":
      return 0.9;
    case "partial":
      return 0.7;
    case "modified":
      return 0.8;
    case "timeout":
      return 0.3;
    case "rejected":
      return 0.2;
    case "failure":
      return 0.0;
    default:
      return 0.5;
  }
}
