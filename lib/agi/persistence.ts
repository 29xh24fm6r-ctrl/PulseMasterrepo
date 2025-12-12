// Persistence Helpers
// lib/agi/persistence.ts

import { AGIRunResult, AGIAction } from "./types";
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

export async function logAGIRunToDB(run: AGIRunResult): Promise<string | null> {
  try {
    const dbUserId = await resolveUserId(run.userId);

    const { data, error } = await supabaseAdmin
      .from("agi_runs")
      .insert({
        user_id: dbUserId,
        started_at: run.startedAt,
        finished_at: run.finishedAt,
        trigger: run.trigger,
        world_snapshot: run.worldSnapshot,
        agent_results: run.agentResults,
        final_plan: run.finalPlan,
        weekly_review_summary: run.weeklyReviewSummary || null,
        weekly_review_summary_narrative: run.weeklyReviewSummaryNarrative || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to log AGI run", error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error("Error logging AGI run:", err);
    return null;
  }
}

export async function logAGIActionsToDB(
  userId: string,
  runId: string,
  actions: AGIAction[]
) {
  try {
    const dbUserId = await resolveUserId(userId);

    const { error } = await supabaseAdmin.from("agi_actions").insert(
      actions.map((action) => ({
        run_id: runId,
        user_id: dbUserId,
        action,
        status: "planned",
      }))
    );

    if (error) {
      console.error("Failed to log AGI actions", error);
    }
  } catch (err) {
    console.error("Error logging AGI actions:", err);
  }
}

