// Coach XP Integration
// lib/xp/applyCoachXP.ts

import { awardXP } from "./award";

// Add coach activities to XP map (extend existing ACTIVITY_XP_MAP)
export const COACH_XP_ACTIVITIES = {
  coach_session_completed: { amount: 30, category: "PXP" },
  coach_session_excellent: { amount: 60, category: "PXP" }, // score > 85
  coach_session_mastery: { amount: 100, category: "PXP" }, // score > 95
  negotiation_practice: { amount: 40, category: "PXP" },
  emotional_coaching: { amount: 35, category: "IXP" },
  scenario_generated: { amount: 25, category: "MXP" },
  voice_analysis_completed: { amount: 30, category: "PXP" },
  multi_agent_session: { amount: 50, category: "PXP" },
};

export interface CoachSessionResults {
  sessionId: string;
  scenarioType: string;
  performanceScore?: number; // 0-100
  confidenceScore?: number; // 0-100
  coachType: string;
  skillNodes: string[];
  difficulty: string;
}

/**
 * Award XP based on coaching session results
 */
export async function applyCoachXP(
  userId: string,
  results: CoachSessionResults
): Promise<{
  xpAwarded: Record<string, number>;
  totalXP: number;
  breakdown: Array<{ activity: string; amount: number; category: string }>;
}> {
  const breakdown: Array<{ activity: string; amount: number; category: string }> = [];
  const xpAwarded: Record<string, number> = { DXP: 0, PXP: 0, IXP: 0, AXP: 0, MXP: 0 };

  // Base session completion XP
  const score = results.performanceScore || results.confidenceScore || 50;
  let activity: string;
  let multiplier = 1;

  if (score >= 95) {
    activity = "coach_session_mastery";
    multiplier = 1.5;
  } else if (score >= 85) {
    activity = "coach_session_excellent";
    multiplier = 1.2;
  } else {
    activity = "coach_session_completed";
  }

  // Award base XP
  const baseResult = await awardXP(activity, "coach_session", {
    sourceId: results.sessionId,
    notes: `${results.scenarioType} - Score: ${score}`,
    customMultiplier: multiplier,
  });

  breakdown.push({
    activity,
    amount: baseResult.amount,
    category: baseResult.category,
  });
  xpAwarded[baseResult.category] = (xpAwarded[baseResult.category] || 0) + baseResult.amount;

  // Additional XP based on coach type
  if (results.coachType === "negotiation") {
    const negResult = await awardXP("negotiation_practice", "coach_session", {
      sourceId: results.sessionId,
      notes: "Negotiation practice",
    });
    breakdown.push({
      activity: "negotiation_practice",
      amount: negResult.amount,
      category: negResult.category,
    });
    xpAwarded[negResult.category] = (xpAwarded[negResult.category] || 0) + negResult.amount;
  }

  if (results.coachType === "emotional") {
    const emoResult = await awardXP("emotional_coaching", "coach_session", {
      sourceId: results.sessionId,
      notes: "Emotional coaching",
    });
    breakdown.push({
      activity: "emotional_coaching",
      amount: emoResult.amount,
      category: emoResult.category,
    });
    xpAwarded[emoResult.category] = (xpAwarded[emoResult.category] || 0) + emoResult.amount;
  }

  // Multi-agent bonus
  if (results.skillNodes.length > 2) {
    const multiResult = await awardXP("multi_agent_session", "coach_session", {
      sourceId: results.sessionId,
      notes: "Multi-agent coaching",
    });
    breakdown.push({
      activity: "multi_agent_session",
      amount: multiResult.amount,
      category: multiResult.category,
    });
    xpAwarded[multiResult.category] = (xpAwarded[multiResult.category] || 0) + multiResult.amount;
  }

  const totalXP = Object.values(xpAwarded).reduce((sum, val) => sum + val, 0);

  return {
    xpAwarded,
    totalXP,
    breakdown,
  };
}

/**
 * Award XP for scenario generation
 */
export async function awardScenarioGenerationXP(
  userId: string,
  scenarioId: string,
  qualityScore: number
): Promise<{ amount: number; category: string }> {
  const multiplier = qualityScore >= 80 ? 1.3 : qualityScore >= 60 ? 1.1 : 1.0;

  return awardXP("scenario_generated", "scenario_generation", {
    sourceId: scenarioId,
    notes: `Quality: ${qualityScore}`,
    customMultiplier: multiplier,
  });
}

/**
 * Award XP for voice analysis
 */
export async function awardVoiceAnalysisXP(
  userId: string,
  sessionId: string
): Promise<{ amount: number; category: string }> {
  return awardXP("voice_analysis_completed", "voice_coaching", {
    sourceId: sessionId,
    notes: "Voice conversation analyzed",
  });
}

