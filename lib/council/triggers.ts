// Council Trigger Detection
// lib/council/triggers.ts

import { CouncilTriggerContext, CouncilTriggerResult, CouncilMode } from "./types";

/**
 * Detect if council should be invoked
 */
export function detectCouncilNeed(
  context: CouncilTriggerContext
): CouncilTriggerResult {
  const { userInput, emotionState, stressScore, primaryCoachId } = context;
  const lowerInput = userInput.toLowerCase();

  // Emotional Support Mode
  if (
    (emotionState === "overwhelmed" || emotionState === "anxious" || emotionState === "depressed") &&
    (lowerInput.includes("i feel") || lowerInput.includes("i'm scared") || lowerInput.includes("i'm lost") ||
     lowerInput.includes("i don't know") || lowerInput.includes("help me"))
  ) {
    return {
      useCouncil: true,
      mode: "emotional_support",
      reason: "high_emotional_need",
    };
  }

  // Crisis Mode (non-self-harm)
  if (
    stressScore && stressScore > 0.8 &&
    (lowerInput.includes("crisis") || lowerInput.includes("emergency") || lowerInput.includes("urgent") ||
     lowerInput.includes("breaking down") || lowerInput.includes("can't handle"))
  ) {
    return {
      useCouncil: true,
      mode: "crisis",
      reason: "high_stress_crisis",
    };
  }

  // Advisory Mode - big decisions
  if (
    lowerInput.includes("what should i do") || lowerInput.includes("should i") ||
    lowerInput.includes("decision") || lowerInput.includes("choose") ||
    lowerInput.includes("job") && (lowerInput.includes("change") || lowerInput.includes("leave") || lowerInput.includes("quit")) ||
    lowerInput.includes("move") || lowerInput.includes("divorce") || lowerInput.includes("break up")
  ) {
    return {
      useCouncil: true,
      mode: "advisory",
      reason: "major_decision",
    };
  }

  // Performance Mode
  if (
    (primaryCoachId === "sales" || primaryCoachId === "motivational") &&
    (lowerInput.includes("stuck") || lowerInput.includes("procrastinating") ||
     lowerInput.includes("can't take action") || lowerInput.includes("unmotivated") ||
     lowerInput.includes("not performing"))
  ) {
    return {
      useCouncil: true,
      mode: "performance",
      reason: "performance_block",
    };
  }

  // Life Navigation Mode
  if (
    lowerInput.includes("plan") || lowerInput.includes("future") || lowerInput.includes("long term") ||
    lowerInput.includes("where am i going") || lowerInput.includes("life direction") ||
    lowerInput.includes("career path") || lowerInput.includes("identity")
  ) {
    return {
      useCouncil: true,
      mode: "life_navigation",
      reason: "long_term_planning",
    };
  }

  // Default: no council
  return {
    useCouncil: false,
  };
}




