// Email Tasks Helpers
// lib/email/tasks.ts

import { supabaseAdmin } from "@/lib/supabase";

export type EmailTaskStatus = "suggested" | "open" | "in_progress" | "done" | "dismissed";

/**
 * Apply task feedback (accepted/rejected)
 */
export async function applyTaskFeedback(params: {
  taskId: string;
  feedback: "accepted" | "rejected";
}): Promise<void> {
  const { taskId, feedback } = params;

  if (feedback === "accepted") {
    // Update status to open and set feedback
    await supabaseAdmin
      .from("email_tasks")
      .update({
        status: "open",
        user_feedback: "accepted",
      })
      .eq("id", taskId);
  } else {
    // Update status to dismissed and set feedback
    await supabaseAdmin
      .from("email_tasks")
      .update({
        status: "dismissed",
        user_feedback: "rejected",
      })
      .eq("id", taskId);
  }
}

