/**
 * Email Resolution Service
 * 
 * Service layer that connects the resolution engine to the database.
 * This provides a clean API for creating, updating, and querying email resolutions.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveEmailThread, type ResolutionInput } from "./emailResolutionEngine";
import type { EmailResolutionState, EmailResolution } from "./types";

/**
 * Creates or updates an email resolution record.
 * 
 * If a resolution already exists, it updates it.
 * If not, it creates a new one.
 */
export async function upsertEmailResolution(input: {
  userId: string;
  emailThreadId: string;
  resolutionInput: ResolutionInput;
}): Promise<EmailResolution | null> {
  const resolution = resolveEmailThread(input.resolutionInput);

  // First, check if resolution exists
  const { data: existing } = await supabaseAdmin
    .from("email_resolution")
    .select("*")
    .eq("user_id", input.userId)
    .eq("email_thread_id", input.emailThreadId)
    .maybeSingle();

  const payload = {
    user_id: input.userId,
    email_thread_id: input.emailThreadId,
    state: resolution.state,
    why: resolution.why,
    evidence: resolution.evidence,
    confidence: resolution.confidence,
    updated_at: new Date().toISOString(),
  };

  let data;
  let error;

  if (existing) {
    // Update existing
    const result = await supabaseAdmin
      .from("email_resolution")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    data = result.data;
    error = result.error;
  } else {
    // Insert new
    const result = await supabaseAdmin
      .from("email_resolution")
      .insert(payload)
      .select()
      .single();
    data = result.data;
    error = result.error;
  }

  if (error) {
    console.error("[resolutionService] Upsert error:", error);
    return null;
  }

  return mapDbRowToResolution(data);
}

/**
 * Gets all unresolved email resolutions for a user.
 */
export async function getUnresolvedResolutions(userId: string): Promise<EmailResolution[]> {
  const { data, error } = await supabaseAdmin
    .from("email_resolution")
    .select("*")
    .eq("user_id", userId)
    .in("state", ["needs_user_action", "waiting_on_other", "scheduled_follow_up"])
    .order("next_action_at", { ascending: true, nullsLast: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[resolutionService] Query error:", error);
    return [];
  }

  return (data || []).map(mapDbRowToResolution);
}

/**
 * Marks an email resolution as converted to task.
 */
export async function markAsConvertedToTask(
  userId: string,
  emailThreadId: string,
  taskId: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("email_resolution")
    .update({
      state: "converted_to_task",
      linked_task_id: taskId,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("email_thread_id", emailThreadId);

  if (error) {
    console.error("[resolutionService] Update error:", error);
    return false;
  }

  return true;
}

/**
 * Marks an email resolution as resolved.
 */
export async function markAsResolved(
  userId: string,
  emailThreadId: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("email_resolution")
    .update({
      state: "resolved",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("email_thread_id", emailThreadId);

  if (error) {
    console.error("[resolutionService] Update error:", error);
    return false;
  }

  return true;
}

/**
 * Maps a database row to an EmailResolution type.
 */
function mapDbRowToResolution(row: any): EmailResolution {
  return {
    id: row.id,
    userId: row.user_id,
    emailThreadId: row.email_thread_id,
    state: row.state as EmailResolutionState,
    why: row.why,
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
    nextActionAt: row.next_action_at ? new Date(row.next_action_at) : null,
    linkedTaskId: row.linked_task_id || null,
    confidence: row.confidence || 100,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

