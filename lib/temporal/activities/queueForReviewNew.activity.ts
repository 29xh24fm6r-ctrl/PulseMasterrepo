// lib/temporal/activities/queueForReview.activity.ts
// Activity: queueForReview
// SPEC: Creates review request + notifications

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { QueueForReviewInput, QueueForReviewOutput } from "../workflows/types";
import { randomUUID } from "crypto";

/**
 * Queue a draft for human review
 *
 * Creates a review request and optionally sends notifications
 * based on priority level.
 */
export async function queueForReviewActivity(
  input: QueueForReviewInput
): Promise<QueueForReviewOutput> {
  const { draftId, userId, sessionId, guardianDecision, priority } = input;
  const supabase = getSupabaseAdmin();
  const reviewRequestId = randomUUID();
  const now = new Date().toISOString();

  // 1. Update draft status to pending_review
  await supabase
    .from("pulse_drafts")
    .update({
      status: "pending_review",
      queued_at: now,
    })
    .eq("id", draftId);

  // 2. Create review request
  const { error: reviewError } = await supabase.from("pulse_review_requests").insert({
    id: reviewRequestId,
    user_id: userId,
    draft_id: draftId,
    session_id: sessionId,
    priority,
    guardian_decision: guardianDecision,
    status: "pending",
    created_at: now,
  });

  if (reviewError) {
    console.error("[queueForReview] Failed to create review request:", reviewError);
    throw reviewError;
  }

  // 3. Emit observer event
  await supabase.from("pulse_observer_events").insert({
    user_id: userId,
    event_type: "review_queued",
    payload: {
      reviewRequestId,
      draftId,
      sessionId,
      priority,
      guardianDecision: {
        allowed: guardianDecision.allowed,
        requiredAction: guardianDecision.requiredAction,
      },
    },
    created_at: now,
  });

  // 4. Create notification for high/urgent priority (Phase 2 stub)
  if (priority === "high" || priority === "urgent") {
    // TODO: Phase 2 - Send push notification / email
    console.log(`[queueForReview] High priority review queued: ${reviewRequestId}`);
  }

  return {
    queued: true,
    reviewRequestId,
  };
}
