// lib/temporal/activities/persistDraft.activity.ts
// Activity: persistDraft
// SPEC: Upsert only, Idempotent

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PersistDraftInput } from "../workflows/types";

/**
 * Persist a draft to the database
 *
 * SPEC RULES:
 * - Upsert only (create or update)
 * - Idempotent (same input = same result)
 * - Uses draft ID as idempotency key
 */
export async function persistDraftActivity(input: PersistDraftInput): Promise<void> {
  const { draftId, userId, content, draftType, confidence, sessionId } = input;
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { error } = await supabase.from("pulse_drafts").upsert(
    {
      id: draftId,
      user_id: userId,
      draft_type: draftType,
      title: content.title || `${draftType} draft`,
      content,
      confidence,
      status: "pending_review",
      session_id: sessionId,
      created_at: now,
      updated_at: now,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("[persistDraft] Failed to upsert draft:", error);
    throw error;
  }

  // Emit observer event
  await supabase.from("pulse_observer_events").insert({
    user_id: userId,
    event_type: "draft_persisted",
    payload: {
      draftId,
      draftType,
      sessionId,
      confidence,
    },
    created_at: now,
  });
}
