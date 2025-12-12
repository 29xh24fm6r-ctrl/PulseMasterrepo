// Coach Hub - Shared Insights Engine
// lib/coach-hub/engine.ts

import { supabaseAdmin } from "@/lib/supabase";
import { CoachId } from "@/lib/coaching/orchestrator";

export interface SharedInsightInput {
  userId: string;
  coachId: CoachId;
  sessionId: string;
  keyTakeaway: string; // one or two sentences
  tags: string[];
  importance?: number;
}

/**
 * Write a shared insight
 */
export async function writeSharedInsight(input: SharedInsightInput): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", input.userId)
    .single();

  const dbUserId = userRow?.id || input.userId;

  // Extract title from first sentence
  const title = input.keyTakeaway.split(".")[0].substring(0, 100) || "Insight";

  await supabaseAdmin.from("coach_shared_insights").insert({
    user_id: dbUserId,
    coach_id: input.coachId,
    title: title,
    body: input.keyTakeaway,
    tags: input.tags,
    importance: input.importance || 0.5,
  });

  console.log(`[CoachHub] Wrote insight from ${input.coachId} for user ${input.userId}`);
}

/**
 * Get relevant insights for a context
 */
export async function getRelevantInsights(
  userId: string,
  coachId: CoachId,
  tags: string[],
  limit: number = 5
): Promise<Array<{ title: string; body: string; coach_id: string | null; importance: number }>> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Query insights
  let query = supabaseAdmin
    .from("coach_shared_insights")
    .select("*")
    .eq("user_id", dbUserId)
    .or(`coach_id.eq.${coachId},coach_id.is.null`)
    .order("importance", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  // If tags provided, filter by tags (using array overlap)
  if (tags.length > 0) {
    // Supabase array overlap: tags && array['tag1', 'tag2']
    query = query.contains("tags", tags);
  }

  const { data: insights } = await query;

  return (insights || []).map((i: any) => ({
    title: i.title,
    body: i.body,
    coach_id: i.coach_id,
    importance: i.importance,
  }));
}

