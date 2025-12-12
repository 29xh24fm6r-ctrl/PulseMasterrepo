// AGI Feedback System - Machine Teaching
// lib/agi/feedback.ts

import { supabaseAdmin } from "@/lib/supabase";

/**
 * Resolve Clerk ID to database user ID
 */
async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export type AGIFeedbackType = "accepted" | "modified" | "rejected";

/**
 * Record user feedback on an AGI action
 */
export async function recordAGIFeedback(
  userId: string,
  actionId: string,
  feedbackType: AGIFeedbackType,
  comment?: string
): Promise<void> {
  try {
    const dbUserId = await resolveUserId(userId);

    const { error } = await supabaseAdmin.from("agi_feedback").insert({
      user_id: dbUserId,
      action_id: actionId,
      feedback_type: feedbackType,
      comment: comment || null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to record AGI feedback", error);
    }
  } catch (err) {
    console.error("Error recording AGI feedback:", err);
  }
}



