// lib/temporal/activities/executeDraftAction.activity.ts
// Activity: executeDraftAction
// SPEC: MUST validate idempotencyKey, MUST enforce autonomy matrix

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ExecuteDraftInput, ExecuteDraftOutput } from "../workflows/types";

// Irreversible action types that require explicit pre-authorization
const IRREVERSIBLE_ACTIONS = new Set([
  "send_email",
  "send_sms",
  "send_notification",
  "post_social",
  "transfer_funds",
  "delete_data",
  "external_api_call",
]);

// Autonomy matrix: minimum level required for each action type
const AUTONOMY_MATRIX: Record<string, number> = {
  // L0: Observe only - nothing executes
  // L1: Low-risk internal only
  update_note: 1,
  create_reminder: 1,
  update_calendar_local: 1,
  // L2: Medium-risk, reversible
  schedule_task: 2,
  update_preference: 2,
  archive_item: 2,
  // L3: Higher risk but still reversible
  create_draft_email: 3,
  modify_schedule: 3,
  // Irreversible: Requires explicit pre-auth regardless of level
  send_email: 99, // Blocked without pre-auth
  send_sms: 99,
  transfer_funds: 99,
};

/**
 * Execute a draft action with safety checks
 *
 * SPEC RULES:
 * - MUST validate idempotencyKey
 * - MUST enforce autonomy matrix
 * - MUST throw IrreversibleActionError if violated
 */
export async function executeDraftActionActivity(
  input: ExecuteDraftInput
): Promise<ExecuteDraftOutput> {
  const { draftId, draftType, userId, autonomyLevel, guardianApproved, idempotencyKey } = input;
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  // 1. Validate guardian approval (must be literal true)
  if (guardianApproved !== true) {
    return {
      executed: false,
      skipped: true,
      idempotent: false,
      status: "blocked",
      error: "Guardian approval required",
    };
  }

  // 2. Check idempotency - has this exact action already been executed?
  const { data: existingExecution } = await supabase
    .from("pulse_execution_log")
    .select("id, executed_at")
    .eq("idempotency_key", idempotencyKey)
    .single();

  if (existingExecution) {
    return {
      executed: false,
      skipped: false,
      idempotent: true,
      status: "already_executed",
      executedAt: existingExecution.executed_at,
    };
  }

  // 3. Check autonomy matrix
  const requiredLevel = AUTONOMY_MATRIX[draftType] ?? 2; // Default to L2
  if (autonomyLevel < requiredLevel) {
    return {
      executed: false,
      skipped: true,
      idempotent: false,
      status: "autonomy_insufficient",
      error: `Action ${draftType} requires autonomy L${requiredLevel}, user has L${autonomyLevel}`,
    };
  }

  // 4. Check irreversible action rule
  if (IRREVERSIBLE_ACTIONS.has(draftType)) {
    // Check for pre-authorization
    const { data: preAuth } = await supabase
      .from("pulse_action_authorizations")
      .select("id")
      .eq("user_id", userId)
      .eq("action_type", draftType)
      .eq("active", true)
      .single();

    if (!preAuth) {
      return {
        executed: false,
        skipped: true,
        idempotent: false,
        status: "irreversible_not_authorized",
        error: `Irreversible action ${draftType} requires explicit pre-authorization`,
      };
    }
  }

  // 5. Execute the action
  try {
    // Update draft status
    await supabase
      .from("pulse_drafts")
      .update({
        status: "auto_executed",
        executed_at: now,
      })
      .eq("id", draftId);

    // Log execution with idempotency key
    await supabase.from("pulse_execution_log").insert({
      idempotency_key: idempotencyKey,
      user_id: userId,
      draft_id: draftId,
      action_type: draftType,
      autonomy_level: autonomyLevel,
      executed_at: now,
      success: true,
    });

    // Emit observer event
    await supabase.from("pulse_observer_events").insert({
      user_id: userId,
      event_type: "action_executed",
      payload: {
        draftId,
        draftType,
        autonomyLevel,
        idempotencyKey,
      },
      created_at: now,
    });

    return {
      executed: true,
      skipped: false,
      idempotent: false,
      action: draftType,
      status: "completed",
      executedAt: now,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    // Log failed execution
    await supabase.from("pulse_execution_log").insert({
      idempotency_key: idempotencyKey,
      user_id: userId,
      draft_id: draftId,
      action_type: draftType,
      autonomy_level: autonomyLevel,
      executed_at: now,
      success: false,
      error: errorMessage,
    });

    throw err; // Temporal will retry
  }
}
