// lib/langgraph/nodes/queue-for-review.ts
// Queue for Review node: Queue drafts for manual review

import type { OmegaState, ReasoningStep } from "../types";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function queueForReviewNode(state: OmegaState): Promise<Partial<OmegaState>> {
  const startTime = Date.now();

  if (!state.draft) {
    return { errors: ["No draft to queue"] };
  }

  try {
    if (state.draft.id) {
      await supabaseAdmin
        .from("pulse_drafts")
        .update({ status: "pending_review" })
        .eq("id", state.draft.id);
    }

    const reason = !state.approved
      ? "Guardian requires modifications"
      : "Confidence below auto-execute threshold";

    const step: ReasoningStep = {
      node: "queue_for_review",
      input: { draftConfidence: state.draft.confidence, approved: state.approved },
      output: { queued: true, reason },
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    return {
      reasoningTrace: [step]
    };
  } catch (error) {
    return {
      errors: [`Queue error: ${error}`],
      reasoningTrace: [{
        node: "queue_for_review",
        input: { draft: state.draft?.title },
        output: { error: String(error) },
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }]
    };
  }
}
