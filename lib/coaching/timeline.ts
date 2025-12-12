// Coaching Timeline Engine
// lib/coaching/timeline.ts

import { supabaseAdmin } from "@/lib/supabase";

export interface CoachingTurn {
  id: string;
  session_id: string;
  turn_index: number;
  user_message: string | null;
  coach_reply: string | null;
  emotion: string | null;
  intent: string | null;
  voice_id: string | null;
  rationale: string | null;
  xp_earned: number;
  created_at: string;
}

export interface CoachingSession {
  id: string;
  user_id: string;
  coach_id: string;
  started_at: string;
  ended_at: string | null;
  emotion_start: string | null;
  emotion_end: string | null;
  xp_earned: number;
  total_turns: number;
  created_at: string;
}

export interface SessionTimeline {
  session: CoachingSession;
  turns: CoachingTurn[];
  emotionalTransitions: Array<{
    from: string | null;
    to: string | null;
    turnIndex: number;
    xpEarned: number;
  }>;
  totalXPEarned: number;
}

/**
 * Compute XP for emotional mastery transitions
 */
export function computeEmotionalXP(
  prev: string | null,
  next: string | null
): number {
  if (!prev || !next) return 0;

  // Positive emotional transitions (mastery)
  if (prev === "stress" && (next === "calm" || next === "stabilize")) return 15;
  if (prev === "sad" && (next === "stabilize" || next === "calm")) return 15;
  if (prev === "angry" && (next === "clarity" || next === "calm")) return 20;
  if (prev === "overwhelmed" && (next === "calm" || next === "plan")) return 15;
  if (prev === "anxious" && (next === "calm" || next === "stabilize")) return 12;
  if (prev === "hype" && (next === "focused" || next === "plan")) return 10;

  // Maintaining positive states
  if (prev === "calm" && next === "calm") return 2;
  if (prev === "stabilize" && next === "stabilize") return 2;
  if (prev === "focused" && next === "focused") return 2;

  // Neutral transitions (small reward for engagement)
  if (prev === next) return 2;

  // Negative transitions (small penalty, but still engagement)
  if (prev === "calm" && (next === "stress" || next === "anxious")) return -5;
  if (prev === "stabilize" && (next === "sad" || next === "angry")) return -5;

  // Default: small reward for any transition (engagement)
  return 3;
}

/**
 * Start a new coaching session
 */
export async function startSession(
  userId: string,
  coachId: string,
  initialEmotion?: string | null
): Promise<string> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const { data: session, error } = await supabaseAdmin
    .from("coaching_sessions")
    .insert({
      user_id: dbUserId,
      coach_id: coachId,
      emotion_start: initialEmotion || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Timeline] Failed to start session:", error);
    throw error;
  }

  return session.id;
}

/**
 * End a coaching session
 */
export async function endSession(
  sessionId: string,
  emotionEnd: string | null,
  totalXPEarned: number
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("coaching_sessions")
    .update({
      ended_at: new Date().toISOString(),
      emotion_end: emotionEnd,
      xp_earned: totalXPEarned,
    })
    .eq("id", sessionId);

  if (error) {
    console.error("[Timeline] Failed to end session:", error);
    throw error;
  }
}

/**
 * Append a turn to the session
 */
export async function appendTurn(params: {
  sessionId: string;
  turnIndex: number;
  userMessage: string;
  coachReply: string;
  emotion: string | null;
  intent: string;
  voiceId: string;
  rationale?: string;
  xpEarned?: number;
}): Promise<void> {
  const { sessionId, turnIndex, userMessage, coachReply, emotion, intent, voiceId, rationale, xpEarned = 0 } = params;

  const { error } = await supabaseAdmin.from("coaching_turns").insert({
    session_id: sessionId,
    turn_index: turnIndex,
    user_message: userMessage,
    coach_reply: coachReply,
    emotion: emotion || null,
    intent: intent,
    voice_id: voiceId,
    rationale: rationale || null,
    xp_earned: xpEarned,
  });

  if (error) {
    console.error("[Timeline] Failed to append turn:", error);
    throw error;
  }

  // Update session turn count
  await supabaseAdmin
    .from("coaching_sessions")
    .update({ total_turns: turnIndex + 1 })
    .eq("id", sessionId);
}

/**
 * Get full session timeline
 */
export async function getSessionTimeline(sessionId: string): Promise<SessionTimeline | null> {
  // Get session
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("coaching_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    console.error("[Timeline] Failed to get session:", sessionError);
    return null;
  }

  // Get turns
  const { data: turns, error: turnsError } = await supabaseAdmin
    .from("coaching_turns")
    .select("*")
    .eq("session_id", sessionId)
    .order("turn_index", { ascending: true });

  if (turnsError) {
    console.error("[Timeline] Failed to get turns:", turnsError);
    return null;
  }

  // Compute emotional transitions
  const emotionalTransitions: Array<{
    from: string | null;
    to: string | null;
    turnIndex: number;
    xpEarned: number;
  }> = [];

  let prevEmotion: string | null = session.emotion_start;
  for (const turn of turns || []) {
    const nextEmotion = turn.emotion;
    const xpEarned = computeEmotionalXP(prevEmotion, nextEmotion);
    
    if (prevEmotion !== nextEmotion) {
      emotionalTransitions.push({
        from: prevEmotion,
        to: nextEmotion,
        turnIndex: turn.turn_index,
        xpEarned,
      });
    }
    
    prevEmotion = nextEmotion;
  }

  const totalXPEarned = (turns || []).reduce((sum, turn) => sum + turn.xp_earned, 0) + session.xp_earned;

  return {
    session: session as CoachingSession,
    turns: (turns || []) as CoachingTurn[],
    emotionalTransitions,
    totalXPEarned,
  };
}

/**
 * Get active session for user + coach
 */
export async function getActiveSession(
  userId: string,
  coachId: string
): Promise<CoachingSession | null> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const { data: session } = await supabaseAdmin
    .from("coaching_sessions")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("coach_id", coachId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return session as CoachingSession | null;
}

/**
 * Get recent sessions for a coach
 */
export async function getRecentSessions(
  userId: string,
  coachId: string,
  limit: number = 3
): Promise<CoachingSession[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const { data: sessions } = await supabaseAdmin
    .from("coaching_sessions")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("coach_id", coachId)
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(limit);

  return (sessions || []) as CoachingSession[];
}

