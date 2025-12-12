// Meta-Coach Supervisor Engine
// lib/meta-coach/engine.ts

import { MetaCoachDecision, MetaCoachContext } from "./types";
import { chooseIntervention } from "@/lib/interventions/engine";
import { CoachId } from "@/lib/coaching/orchestrator";

/**
 * Decide meta-coach action based on context
 */
export async function decideMetaCoachAction(
  ctx: MetaCoachContext
): Promise<MetaCoachDecision> {
  // 1. Check for high-risk prediction that needs intervention
  if (ctx.riskPrediction && ctx.riskPrediction.risk_score > 0.7) {
    const intervention = await chooseIntervention({
      userId: ctx.userId,
      coachId: ctx.currentCoachId,
      emotion: ctx.emotionPrimary,
      riskType: ctx.riskPrediction.risk_type,
      riskScore: ctx.riskPrediction.risk_score,
    });

    if (intervention) {
      return {
        action: "trigger_intervention",
        interventionKey: intervention.intervention.key,
        reason: `High risk detected (${ctx.riskPrediction.risk_type}, score: ${ctx.riskPrediction.risk_score.toFixed(2)}). ${intervention.reason}`,
      };
    }
  }

  // 2. Check for emotional state that suggests coach switch
  const emotion = ctx.emotionPrimary?.toLowerCase();

  // Overwhelmed/stress -> suggest Confidant
  if ((emotion === "overwhelmed" || emotion === "stress" || emotion === "anxious") && ctx.currentCoachId !== "confidant") {
    // Check if user has been with current coach for multiple turns
    const recentSameCoach = ctx.recentTurns?.filter((t) => t.coachId === ctx.currentCoachId).length || 0;
    
    if (recentSameCoach >= 2) {
      return {
        action: "switch_coach",
        targetCoachId: "confidant",
        reason: "User is overwhelmed; route to Confidant for emotional regulation first.",
      };
    }
  }

  // Sad/down -> suggest Confidant
  if ((emotion === "sad" || emotion === "down" || emotion === "low") && ctx.currentCoachId !== "confidant") {
    return {
      action: "switch_coach",
      targetCoachId: "confidant",
      reason: "User is feeling down; Confidant Coach can provide emotional support.",
    };
  }

  // Hype/energized -> suggest Warrior if not already
  if ((emotion === "hype" || emotion === "energized") && ctx.currentCoachId !== "warrior") {
    const recentChallengeIntents = ctx.recentTurns?.filter(
      (t) => t.intent === "challenge" || t.intent === "hype"
    ).length || 0;

    if (recentChallengeIntents >= 2) {
      return {
        action: "switch_coach",
        targetCoachId: "warrior",
        reason: "User is energized and responding to challenges; Warrior Coach can channel this energy.",
      };
    }
  }

  // 3. Check for repeated challenge intents with worsening emotion
  if (ctx.recentTurns && ctx.recentTurns.length >= 3) {
    const lastThree = ctx.recentTurns.slice(-3);
    const challengeCount = lastThree.filter((t) => t.intent === "challenge").length;
    const emotions = lastThree.map((t) => t.emotion?.toLowerCase()).filter(Boolean);

    if (challengeCount >= 2 && emotions.some((e) => e === "stress" || e === "overwhelmed")) {
      return {
        action: "switch_coach",
        targetCoachId: "confidant",
        reason: "Multiple challenge intents with increasing stress; switching to supportive mode.",
      };
    }
  }

  // 4. Check for intervention opportunity even without high risk
  if (ctx.emotionPrimary) {
    const intervention = await chooseIntervention({
      userId: ctx.userId,
      coachId: ctx.currentCoachId,
      emotion: ctx.emotionPrimary,
      riskType: ctx.riskPrediction?.risk_type || null,
      riskScore: ctx.riskPrediction?.risk_score || null,
    });

    if (intervention && ctx.emotionPrimary === "stress") {
      return {
        action: "trigger_intervention",
        interventionKey: intervention.intervention.key,
        reason: `Stress detected. ${intervention.reason}`,
      };
    }
  }

  // 5. Default: stay with current coach
  return {
    action: "stay_with_current_coach",
    reason: "Current coach is appropriate for this context.",
  };
}

