// Coaching Engine
// lib/coaching/engine.ts

import { chooseReplyIntent, CoachId, EmotionSnapshot, OrchestratorInput } from "./orchestrator";
import { getDynamicVoiceProfile } from "@/lib/voice/emotion-switcher";
import { generateCoachReply } from "./llm-replies";
import { getCurrentEmotionState } from "@/lib/emotion-os";
import {
  startSession,
  getActiveSession,
  appendTurn,
  computeEmotionalXP,
  endSession,
} from "./timeline";
import { supabaseAdmin } from "@/lib/supabase";
import { runCoachCouncil } from "@/lib/council/orchestrator";

export interface GenerateReplyParams {
  userId: string;
  coachId: CoachId;
  userMessage: string;
  emotion?: EmotionSnapshot; // Optional - will fetch from Emotion OS if not provided
  sessionId?: string; // Optional - if provided, will append to existing session
  contactId?: string | null; // Optional - if coaching about a specific contact
  context?: {
    previousMessages?: Array<{ role: string; content: string }>;
    scenarioInfo?: any;
  };
}

export interface CoachTurnResult {
  replyText: string;
  voiceProfile: {
    voiceId: string;
    speed: number;
    energy: number;
    warmth: number;
    temporary: boolean;
    emotion?: string | null;
    reason?: string;
  };
  intent: {
    id: string;
    label: string;
    description: string;
  };
  rationale: string;
  detectedEmotion: EmotionSnapshot;
  sessionId: string;
  turnIndex: number;
  xpEarned: number;
  totalSessionXP: number;
}

/**
 * Generate a complete coach turn with emotion-aware intent and voice
 */
export async function generateCoachTurn(
  params: GenerateReplyParams
): Promise<CoachTurnResult> {
  const { userId, coachId, userMessage, emotion: providedEmotion, sessionId: providedSessionId, endSession = false, context } = params;

  // 1. Get or create session
  let sessionId = providedSessionId;
  let turnIndex = 0;
  let prevEmotion: string | null = null;

  if (!sessionId) {
    // Get active session or create new one
    const activeSession = await getActiveSession(userId, coachId);
    if (activeSession) {
      sessionId = activeSession.id;
      turnIndex = activeSession.total_turns;
      prevEmotion = activeSession.emotion_end || activeSession.emotion_start;
    } else {
      // Start new session
      sessionId = await startSession(userId, coachId, providedEmotion?.primary || null);
      turnIndex = 0;
    }
  } else {
    // Get turn index from existing session
    const activeSession = await getActiveSession(userId, coachId);
    if (activeSession && activeSession.id === sessionId) {
      turnIndex = activeSession.total_turns;
      prevEmotion = activeSession.emotion_end || activeSession.emotion_start;
    }
  }

  // 2. Get emotion state (from provided or Emotion OS)
  let emotion: EmotionSnapshot;
  if (providedEmotion) {
    emotion = providedEmotion;
  } else {
    try {
      const emotionState = await getCurrentEmotionState(userId);
      emotion = {
        primary: emotionState?.detected_emotion?.toLowerCase() || null,
        intensity: emotionState?.intensity || undefined,
      };
    } catch (err) {
      console.warn("[CoachingEngine] Failed to get emotion state:", err);
      emotion = { primary: null };
    }
  }

  // 3. Calculate XP for emotional transition
  const xpEarned = computeEmotionalXP(prevEmotion, emotion.primary);

  // 3.5. Check if council should be invoked
  let councilResult = null;
  try {
    // Get career context for user model
    let careerContext = null;
    try {
      const { getCareerContextForMemory } = await import("@/lib/career/integrations");
      careerContext = await getCareerContextForMemory(userId);
    } catch (err) {
      // Career context optional
    }

    const userModel = {
      emotion_state: emotion.primary,
      stress_score: emotion.intensity || 0,
      career_level: careerContext?.level,
    };

    councilResult = await runCoachCouncil({
      userId,
      primaryCoachId: coachId,
      userInput: userMessage,
      userModel,
    });

    if (councilResult.usedCouncil) {
      // Use council response
      const councilReplyText = councilResult.answer;

      // Append turn with council response
      try {
        await appendTurn({
          sessionId,
          turnIndex,
          userMessage,
          coachReply: councilReplyText,
          emotion: emotion.primary,
          intent: "council_response",
          voiceId: "council",
          rationale: `Council mode: ${councilResult.sessionId ? "used" : "blocked"}`,
          xpEarned,
        });
      } catch (err) {
        console.warn("[CoachingEngine] Failed to append council turn:", err);
      }

      // Get total session XP
      const { data: session } = await supabaseAdmin
        .from("coaching_sessions")
        .select("xp_earned")
        .eq("id", sessionId)
        .single();

      const totalSessionXP = (session?.xp_earned || 0) + xpEarned;

      return {
        replyText: councilReplyText,
        voiceProfile: {
          voiceId: "council",
          speed: 1.0,
          energy: 0.6,
          warmth: 0.7,
          temporary: false,
          reason: "Coach Council response",
        },
        intent: {
          id: "council",
          label: "Council Response",
          description: "Response from multiple coaches",
        },
        rationale: "Coach Council orchestration",
        detectedEmotion: emotion,
        sessionId,
        turnIndex,
        xpEarned,
        totalSessionXP,
      };
    }
  } catch (err) {
    console.warn("[CoachingEngine] Council check failed, falling back to single coach:", err);
  }

  // 4. Decide reply intent based on coach + emotion
  const decision = chooseReplyIntent({
    coachId,
    emotion,
    userMessage,
  });

  // 5. Get dynamic voice profile (already implemented)
  const voiceProfile = await getDynamicVoiceProfile(userId, coachId, userMessage);

  // 6. Get relevant insights from Coach Hub
  let relevantInsights: Array<{ title: string; body: string; coach_id: string | null }> = [];
  try {
    const { getRelevantInsights } = await import("@/lib/coach-hub/engine");
    const tags = context?.scenarioInfo?.tags || [];
    relevantInsights = await getRelevantInsights(userId, coachId, tags, 3);
  } catch (err) {
    console.warn("[CoachingEngine] Failed to get insights:", err);
  }

  // 6. Load contact playbook if contactId provided
  let contactPlaybook = null;
  if (params.contactId) {
    try {
      const { getContactPlaybook } = await import("@/lib/contacts/playbook");
      contactPlaybook = await getContactPlaybook({
        userId,
        contactId: params.contactId,
      });
    } catch (err) {
      console.warn("[CoachingEngine] Failed to load contact playbook:", err);
    }
  }

  // 6.3. Load career context for coaching
  let careerContext = null;
  try {
    const { getCareerContextForMemory } = await import("@/lib/career/integrations");
    careerContext = await getCareerContextForMemory(userId);
  } catch (err) {
    console.warn("[CoachingEngine] Failed to load career context:", err);
  }

  // 6.5. Generate textual reply using LLM with intent config, insights, playbook, and career context
  let replyText = await generateCoachReply({
    userId,
    coachId,
    userMessage,
    intent: decision.intent,
    voiceProfile,
    emotion,
    contactId: params.contactId || null,
    contactPlaybook,
    careerContext,
    context: {
      ...context,
      relevantInsights: relevantInsights.map((i) => i.body).join("\n"),
    },
  });

  // 6.5.5. Apply microstyle transformation (v5)
  try {
    const { getMicrostylePrefs, applyMicrostyleToText } = await import("@/lib/personas/microstyle");
    const microstyle = await getMicrostylePrefs(userId, resolvedPersona.id, coachId);
    
    // Get user's first name if available
    let userName: string | undefined;
    try {
      const { data: userProfile } = await supabaseAdmin
        .from("users")
        .select("first_name")
        .eq("clerk_id", userId)
        .maybeSingle();
      userName = userProfile?.first_name;
    } catch (err) {
      // Optional
    }

    replyText = applyMicrostyleToText(replyText, microstyle, userName);
  } catch (err) {
    // Microstyle optional
  }

  // 6.5. Compute identity resonance and enhance reply
  try {
    const { computeIdentityResonance, logIdentityResonance } = await import("@/lib/identity/resonance");
    const resonance = await computeIdentityResonance(userId, {
      coachId,
      tags: context?.scenarioInfo?.tags || [],
      emotion: emotion.primary,
    });

    if (resonance && resonance.score > 0.6) {
      replyText += `\n\n_[Identity Boost: ${resonance.identity.name}] ${resonance.message}_`;

      // Log resonance link
      await logIdentityResonance(
        userId,
        resonance.identity,
        "coach_turn",
        `${sessionId}_${turnIndex}`,
        resonance.score,
        context?.scenarioInfo?.tags || []
      );
    }
  } catch (err) {
    console.warn("[CoachingEngine] Failed to compute identity resonance:", err);
    // Don't fail the request if resonance fails
  }

  // 7. Append turn to timeline
  try {
    await appendTurn({
      sessionId,
      turnIndex,
      userMessage,
      coachReply: replyText,
      emotion: emotion.primary,
      intent: decision.intent.id,
      voiceId: voiceProfile.voiceId,
      rationale: decision.rationale,
      xpEarned,
    });
  } catch (err) {
    console.warn("[CoachingEngine] Failed to append turn:", err);
    // Don't fail the request if timeline logging fails
  }

  // 8. Award XP if earned (base is 10, so xpEarned/10 gives us the multiplier)
  if (xpEarned > 0) {
    try {
      const { awardXP } = await import("@/lib/xp/award");
      const multiplier = xpEarned / 10; // Base is 10, so divide to get multiplier
      await awardXP(
        "coach_emotional_mastery",
        "coaching_session",
        {
          sourceId: sessionId,
          notes: `Emotional transition: ${prevEmotion || "neutral"} → ${emotion.primary || "neutral"}`,
          customMultiplier: multiplier,
        }
      );
    } catch (err) {
      console.warn("[CoachingEngine] Failed to award XP:", err);
      // Don't fail the request if XP fails
    }
  }

  // 9. Get total session XP
  const { data: session } = await supabaseAdmin
    .from("coaching_sessions")
    .select("xp_earned")
    .eq("id", sessionId)
    .single();

  const totalSessionXP = (session?.xp_earned || 0) + xpEarned;

  // 10. Write shared insight if session is ending or significant
  if (endSession || turnIndex >= 5) {
    try {
      const { writeSharedInsight } = await import("@/lib/coach-hub/engine");
      // Generate a simple insight from the session
      const insight = `User showed ${emotion.primary || "neutral"} emotion during ${coachId} coaching. ${decision.intent.label} intent was most effective.`;
      await writeSharedInsight({
        userId,
        coachId,
        sessionId,
        keyTakeaway: insight,
        tags: context?.scenarioInfo?.tags || [coachId],
        importance: 0.6,
      });
    } catch (err) {
      console.warn("[CoachingEngine] Failed to write insight:", err);
    }
  }

  // 11. Log persona interaction for memory learning (v3)
  let resolvedPersonaId: string | undefined;
  try {
    const { updatePersonaUserState } = await import("@/lib/personas/memory");
    const { planPersonaResponse } = await import("@/lib/personas/planner");
    
    // Get the persona that was actually used
    const plan = await planPersonaResponse({
      userId,
      coachId,
      context: {
        coachId,
        userEmotion: emotion,
        jobContext: careerContext ? {
          level: careerContext.level,
          progressToNext: careerContext.progressToNext,
        } : undefined,
      },
    });
    
    resolvedPersonaId = plan.personaProfile.id;
    
    // Log interaction (feedback will be updated later if user provides it)
    await updatePersonaUserState({
      userId,
      personaId: plan.personaProfile.id,
      coachId,
      outcomeTag: "neutral", // Can be updated based on session outcome
      tuningApplied: plan.personaProfile.style,
      implicitSignals: {
        emotion: emotion.primary,
        intensity: emotion.intensity,
        session_id: sessionId,
      },
    });
  } catch (err) {
    console.warn("[CoachingEngine] Failed to log persona interaction:", err);
  }

  // 12. Update companion state after interaction (v5)
  if (resolvedPersonaId) {
    try {
      const { updateCompanionAfterInteraction } = await import("@/lib/personas/companion");
      const { considerHighlightFromInteraction } = await import("@/lib/personas/callbacks");
      
      // Determine outcome tag from emotion shift
      let outcomeTag: "positive" | "neutral" | "negative" = "neutral";
      const currentEmotion = emotion.primary;
      
      // Simple heuristic: if emotion improved, positive; if worsened, negative
      if (prevEmotion && currentEmotion) {
        const emotionHierarchy = ["depressed", "sad", "anxious", "neutral", "calm", "happy", "excited"];
        const prevIdx = emotionHierarchy.indexOf(prevEmotion);
        const currIdx = emotionHierarchy.indexOf(currentEmotion);
        if (currIdx > prevIdx + 1) outcomeTag = "positive";
        else if (currIdx < prevIdx - 1) outcomeTag = "negative";
      }

      // Calculate emotional shift
      const emotionalShift = emotion.intensity ? (emotion.intensity - (prevEmotion ? 0.5 : 0)) : 0;

      await updateCompanionAfterInteraction({
        userId,
        personaId: resolvedPersonaId,
        coachId,
        outcomeTag,
        emotionalShift,
      });

      // Consider capturing highlight
      await considerHighlightFromInteraction({
        userId,
        personaId: resolvedPersonaId,
        coachId,
        transcript: `${userMessage} → ${replyText.substring(0, 200)}`,
        outcomeTag,
      });
    } catch (err) {
      console.warn("[CoachingEngine] Failed to update companion state:", err);
    }
  }

  return {
    replyText,
    voiceProfile,
    intent: {
      id: decision.intent.id,
      label: decision.intent.label,
      description: decision.intent.description,
    },
    rationale: decision.rationale,
    detectedEmotion: emotion,
    sessionId,
    turnIndex,
    xpEarned,
    totalSessionXP,
  };
}

