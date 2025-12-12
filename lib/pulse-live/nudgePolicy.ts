/**
 * Severity-Based Nudge Policy
 * lib/pulse-live/nudgePolicy.ts
 */

export interface NudgeDecision {
  should_nudge: boolean;
  criticality: number; // 0-1
  frequency: "normal" | "frequent" | "aggressive" | "immediate";
  message?: string;
}

/**
 * Evaluate whether to nudge based on criticality
 */
export function evaluateNudge(criticality: number, lastNudgeTime?: Date): NudgeDecision {
  const now = new Date();
  const timeSinceLastNudge = lastNudgeTime
    ? (now.getTime() - lastNudgeTime.getTime()) / 1000
    : Infinity;

  let shouldNudge = false;
  let frequency: NudgeDecision["frequency"] = "normal";
  const minInterval: Record<string, number> = {
    normal: 30, // 30 seconds
    frequent: 15, // 15 seconds
    aggressive: 8, // 8 seconds
    immediate: 3, // 3 seconds (can burst)
  };

  if (criticality < 0.6) {
    frequency = "normal";
    shouldNudge = timeSinceLastNudge > minInterval.normal;
  } else if (criticality < 0.8) {
    frequency = "frequent";
    shouldNudge = timeSinceLastNudge > minInterval.frequent;
  } else if (criticality < 0.92) {
    frequency = "aggressive";
    shouldNudge = timeSinceLastNudge > minInterval.aggressive;
  } else {
    frequency = "immediate";
    shouldNudge = timeSinceLastNudge > minInterval.immediate; // Can burst for >0.92
  }

  return {
    should_nudge: shouldNudge,
    criticality,
    frequency,
  };
}

/**
 * Generate nudge message based on context
 */
export function generateNudgeMessage(
  transcript: string,
  extraction: {
    objections?: string[];
    decisions?: string[];
    risks?: string[];
    action_items?: string[];
  },
  criticality: number
): string {
  // High criticality nudges
  if (criticality > 0.9) {
    if (extraction.objections && extraction.objections.length > 0) {
      return `⚠️ Objection detected: "${extraction.objections[0]}". Address this now.`;
    }
    if (extraction.risks && extraction.risks.length > 0) {
      return `🚨 Risk identified: "${extraction.risks[0]}". Mitigate immediately.`;
    }
    return "🚨 Critical moment. Stay focused.";
  }

  // Medium-high criticality
  if (criticality > 0.75) {
    if (extraction.decisions && extraction.decisions.length > 0) {
      return `⚡ Decision point: "${extraction.decisions[0]}". Clarify next steps.`;
    }
    return "⚡ High leverage moment. Make it count.";
  }

  // Medium criticality
  if (criticality > 0.6) {
    if (extraction.action_items && extraction.action_items.length > 0) {
      return `📋 Action item: "${extraction.action_items[0]}". Confirm commitment.`;
    }
    return "📋 Good momentum. Keep pushing forward.";
  }

  // Low criticality - normal pacing
  return "";
}

