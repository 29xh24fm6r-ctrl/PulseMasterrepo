// Focus Session Management
// lib/productivity/focus.ts

import { supabaseAdmin } from "@/lib/supabase";
import { FocusSession, FocusModeType } from "./types";

/**
 * Start a focus session
 */
export async function startFocusSession(
  userId: string,
  mode: FocusModeType,
  workItemIds: string[]
): Promise<FocusSession> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  const session: Omit<FocusSession, "id"> = {
    userId: dbUserId,
    mode,
    startedAt: new Date().toISOString(),
    endedAt: null,
    workItemIds,
    completedCount: 0,
    totalPlanned: workItemIds.length,
    xpAwarded: undefined,
  };

  const { data, error } = await supabaseAdmin
    .from("focus_sessions")
    .insert(session)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    ...session,
  };
}

/**
 * End a focus session and award XP
 */
export async function endFocusSession(
  sessionId: string,
  completedItemIds: string[]
): Promise<void> {
  const { data: session } = await supabaseAdmin
    .from("focus_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (!session) throw new Error("Session not found");

  const completedCount = completedItemIds.length;
  const completionRate = session.total_planned > 0 
    ? completedCount / session.total_planned 
    : 0;

  // Calculate XP based on completion rate and session length
  const startedAt = new Date(session.started_at);
  const endedAt = new Date();
  const durationMinutes = Math.floor((endedAt.getTime() - startedAt.getTime()) / (1000 * 60));

  // Base XP: 10 per completed item + time bonus
  let xpAwarded = completedCount * 10;
  if (completionRate >= 0.8) xpAwarded += 20; // Completion bonus
  if (durationMinutes >= 25) xpAwarded += 15; // Focus duration bonus

  // Update session
  await supabaseAdmin
    .from("focus_sessions")
    .update({
      ended_at: endedAt.toISOString(),
      completed_count: completedCount,
      xp_awarded: xpAwarded,
    })
    .eq("id", sessionId);

  // Award XP via XP Engine (if available)
  try {
    await supabaseAdmin.from("xp_transactions").insert({
      user_id: session.user_id,
      amount: xpAwarded,
      category: "discipline",
      source: "focus_session",
      source_id: sessionId,
      metadata: {
        mode: session.mode,
        completed: completedCount,
        duration: durationMinutes,
      },
    });
  } catch (err) {
    console.warn("[FocusSession] Failed to award XP:", err);
  }

  // Mark work items as completed
  for (const itemId of completedItemIds) {
    const [source, id] = itemId.split("_");
    
    try {
      if (source === "task") {
        await supabaseAdmin
          .from("tasks")
          .update({ status: "completed" })
          .eq("id", id);
      } else if (source === "email") {
        await supabaseAdmin
          .from("email_followups")
          .update({ status: "completed" })
          .eq("id", id);
      }
      // Add other source types as needed
    } catch (err) {
      console.warn(`[FocusSession] Failed to mark ${source} ${id} as done:`, err);
    }
  }
}

/**
 * Get active focus session for user
 */
export async function getActiveSession(userId: string): Promise<FocusSession | null> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  const { data } = await supabaseAdmin
    .from("focus_sessions")
    .select("*")
    .eq("user_id", dbUserId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    mode: data.mode as FocusModeType,
    startedAt: data.started_at,
    endedAt: data.ended_at || undefined,
    workItemIds: data.work_item_ids || [],
    completedCount: data.completed_count || 0,
    totalPlanned: data.total_planned || 0,
    xpAwarded: data.xp_awarded || undefined,
  };
}



