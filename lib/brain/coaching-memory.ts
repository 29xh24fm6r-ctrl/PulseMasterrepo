// Coaching Memory Storage
// lib/brain/coaching-memory.ts

import { supabaseAdmin } from "@/lib/supabase";
import { SessionTimeline, CoachingSession } from "@/lib/coaching/timeline";

export interface CoachSessionMemory {
  sessionId: string;
  coachId: string;
  startedAt: string;
  endedAt: string;
  turns: Array<{
    turnIndex: number;
    userMessage: string;
    coachReply: string;
    emotion: string | null;
    intent: string;
    voiceId: string;
    rationale: string | null;
    xpEarned: number;
  }>;
  emotionalSummary: {
    startEmotion: string | null;
    endEmotion: string | null;
    transitions: Array<{
      from: string | null;
      to: string | null;
      turnIndex: number;
    }>;
    dominantEmotion: string | null;
  };
  xpEarned: number;
  totalTurns: number;
}

/**
 * Save coaching session to Second Brain memory
 */
export async function saveCoachSessionMemory(
  userId: string,
  timeline: SessionTimeline
): Promise<void> {
  try {
    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Build memory object
    const memory: CoachSessionMemory = {
      sessionId: timeline.session.id,
      coachId: timeline.session.coach_id,
      startedAt: timeline.session.started_at,
      endedAt: timeline.session.ended_at || new Date().toISOString(),
      turns: timeline.turns.map((turn) => ({
        turnIndex: turn.turn_index,
        userMessage: turn.user_message || "",
        coachReply: turn.coach_reply || "",
        emotion: turn.emotion,
        intent: turn.intent || "",
        voiceId: turn.voice_id || "",
        rationale: turn.rationale,
        xpEarned: turn.xp_earned,
      })),
      emotionalSummary: {
        startEmotion: timeline.session.emotion_start,
        endEmotion: timeline.session.emotion_end,
        transitions: timeline.emotionalTransitions.map((t) => ({
          from: t.from,
          to: t.to,
          turnIndex: t.turnIndex,
        })),
        dominantEmotion: getDominantEmotion(timeline.turns),
      },
      xpEarned: timeline.totalXPEarned,
      totalTurns: timeline.turns.length,
    };

    // Store in Second Brain (using tb_memory_fragments or similar)
    // For now, we'll store as a structured memory fragment
    const memoryContent = `Coaching Session Summary:
Coach: ${timeline.session.coach_id}
Started: ${new Date(timeline.session.started_at).toLocaleString()}
Ended: ${timeline.session.ended_at ? new Date(timeline.session.ended_at).toLocaleString() : "In progress"}
Total Turns: ${timeline.turns.length}
XP Earned: ${timeline.totalXPEarned}

Emotional Journey:
Start: ${timeline.session.emotion_start || "neutral"}
End: ${timeline.session.emotion_end || "neutral"}
Transitions: ${timeline.emotionalTransitions.length}

Key Moments:
${timeline.turns
  .filter((t) => t.emotion && t.intent)
  .map(
    (t) =>
      `Turn ${t.turn_index}: ${t.emotion} → Intent: ${t.intent} (${t.rationale || "N/A"})`
  )
  .join("\n")}

Session ID: ${timeline.session.id}`;

    // Store in memory fragments table (if exists) or third_brain_memories
    try {
      // Try tb_memory_fragments first
      await supabaseAdmin.from("tb_memory_fragments").insert({
        user_id: dbUserId,
        content: memoryContent,
        category: "coaching",
        metadata: {
          type: "coaching_session",
          sessionId: timeline.session.id,
          coachId: timeline.session.coach_id,
          memory: memory,
        },
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      // Fallback to third_brain_memories
      const { upsertMemory } = await import("@/lib/third-brain/service");
      await upsertMemory({
        userId: dbUserId,
        category: "coaching",
        key: `coaching_session_${timeline.session.id}`,
        content: memoryContent,
        importance: 7,
        metadata: {
          type: "coaching_session",
          sessionId: timeline.session.id,
          coachId: timeline.session.coach_id,
          memory: memory,
        },
      });
    }

    console.log(`[CoachingMemory] Saved session ${timeline.session.id} to Second Brain`);
  } catch (err) {
    console.error("[CoachingMemory] Failed to save session memory:", err);
    throw err;
  }
}

/**
 * Load recent coaching session memories
 */
export async function loadRecentCoachMemories(
  userId: string,
  coachId: string,
  limit: number = 3
): Promise<CoachSessionMemory[]> {
  try {
    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Get recent sessions from coaching_sessions table
    const { data: sessions } = await supabaseAdmin
      .from("coaching_sessions")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("coach_id", coachId)
      .not("ended_at", "is", null)
      .order("ended_at", { ascending: false })
      .limit(limit);

    if (!sessions || sessions.length === 0) {
      return [];
    }

    // Load full timelines for each session
    const memories: CoachSessionMemory[] = [];
    for (const session of sessions) {
      const { getSessionTimeline } = await import("@/lib/coaching/timeline");
      const timeline = await getSessionTimeline(session.id);
      
      if (timeline) {
        memories.push({
          sessionId: timeline.session.id,
          coachId: timeline.session.coach_id,
          startedAt: timeline.session.started_at,
          endedAt: timeline.session.ended_at || new Date().toISOString(),
          turns: timeline.turns.map((t) => ({
            turnIndex: t.turn_index,
            userMessage: t.user_message || "",
            coachReply: t.coach_reply || "",
            emotion: t.emotion,
            intent: t.intent || "",
            voiceId: t.voice_id || "",
            rationale: t.rationale,
            xpEarned: t.xp_earned,
          })),
          emotionalSummary: {
            startEmotion: timeline.session.emotion_start,
            endEmotion: timeline.session.emotion_end,
            transitions: timeline.emotionalTransitions.map((t) => ({
              from: t.from,
              to: t.to,
              turnIndex: t.turnIndex,
            })),
            dominantEmotion: getDominantEmotion(timeline.turns),
          },
          xpEarned: timeline.totalXPEarned,
          totalTurns: timeline.turns.length,
        });
      }
    }

    return memories;
  } catch (err) {
    console.error("[CoachingMemory] Failed to load memories:", err);
    return [];
  }
}

/**
 * Generate contextual greeting based on recent memories
 */
export async function generateContextualGreeting(
  userId: string,
  coachId: string
): Promise<string | null> {
  const memories = await loadRecentCoachMemories(userId, coachId, 3);

  if (memories.length === 0) {
    return null;
  }

  const lastSession = memories[0];
  const emotionalPattern = detectEmotionalPattern(memories);

  // Build greeting based on last session
  let greeting = "";

  if (lastSession.emotionalSummary.endEmotion === "stress" || lastSession.emotionalSummary.endEmotion === "overwhelmed") {
    greeting = `Welcome back. Last time we talked, you were feeling ${lastSession.emotionalSummary.endEmotion}, but we made progress by creating a plan. Want to continue where we left off?`;
  } else if (lastSession.emotionalSummary.endEmotion === "calm" || lastSession.emotionalSummary.endEmotion === "stabilize") {
    greeting = `Good to see you again. Last session ended on a positive note - you were feeling ${lastSession.emotionalSummary.endEmotion}. How are you feeling today?`;
  } else if (emotionalPattern) {
    greeting = `I've noticed the last ${memories.length} sessions ${emotionalPattern}. ${emotionalPattern.includes("stress") ? "Would you like to try a grounding exercise first?" : "How can I help you today?"}`;
  } else {
    greeting = `Welcome back. Last time we worked together, you earned ${lastSession.xpEarned} XP. Ready to continue?`;
  }

  return greeting;
}

/**
 * Helper: Get dominant emotion from turns
 */
function getDominantEmotion(turns: Array<{ emotion: string | null }>): string | null {
  const emotionCounts = new Map<string, number>();
  turns.forEach((t) => {
    if (t.emotion) {
      emotionCounts.set(t.emotion, (emotionCounts.get(t.emotion) || 0) + 1);
    }
  });

  let maxCount = 0;
  let dominant: string | null = null;
  emotionCounts.forEach((count, emotion) => {
    if (count > maxCount) {
      maxCount = count;
      dominant = emotion;
    }
  });

  return dominant;
}

/**
 * Helper: Detect emotional patterns across sessions
 */
function detectEmotionalPattern(memories: CoachSessionMemory[]): string | null {
  if (memories.length < 2) return null;

  const startEmotions = memories.map((m) => m.emotionalSummary.startEmotion).filter(Boolean);
  
  // Check if sessions consistently start with same emotion
  const stressStarts = startEmotions.filter((e) => e === "stress" || e === "overwhelmed" || e === "anxious").length;
  const sadStarts = startEmotions.filter((e) => e === "sad" || e === "down").length;

  if (stressStarts >= 2) {
    return "started with stress or feeling overwhelmed";
  }
  if (sadStarts >= 2) {
    return "started with sadness or feeling down";
  }

  return null;
}

