// lib/temporal/activities/queueForReview.activity.ts
// Activity that queues drafts for human review

import { createClient } from "@supabase/supabase-js";
import type { OmegaState } from "@/lib/langgraph/types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface QueueResult {
  queued: boolean;
  draftId?: string;
  reason?: string;
}

/**
 * Queue a draft for human review
 * Called when draft is not auto-executable (requires confirmation, blocked, etc.)
 */
export async function queueForReviewActivity(state: OmegaState): Promise<QueueResult> {
  if (!state.draft) {
    return {
      queued: false,
      reason: "No draft to queue",
    };
  }

  try {
    // Update draft status to pending_review if we have an ID
    if (state.draft.id) {
      const { error } = await supabaseAdmin
        .from("pulse_drafts")
        .update({ status: "pending_review" })
        .eq("id", state.draft.id);

      if (error) {
        console.error("[Temporal:queueForReview] Failed to update draft:", error);
        throw error;
      }
    }

    // Create a notification for the user
    await supabaseAdmin.from("pulse_notifications").insert({
      user_id: state.userId,
      notification_type: "draft_pending_review",
      title: `Review Required: ${state.draft.title}`,
      body: state.guardianReview?.modificationsRequired?.length
        ? `Action needed: ${state.guardianReview.modificationsRequired.slice(0, 2).join(", ")}`
        : "A draft is waiting for your approval",
      metadata: {
        sessionId: state.sessionId,
        draftId: state.draft.id,
        draftType: state.draft.draftType,
        confidence: state.draft.confidence,
        riskAssessment: state.guardianReview?.riskAssessment,
      },
      read: false,
    });

    return {
      queued: true,
      draftId: state.draft.id,
    };
  } catch (err) {
    console.error("[Temporal:queueForReview] Error:", err);
    throw err;
  }
}
