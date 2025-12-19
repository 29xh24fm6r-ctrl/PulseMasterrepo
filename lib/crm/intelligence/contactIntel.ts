/**
 * Contact Intelligence Engine
 * Deterministic scoring and intelligence (works without LLM)
 */

interface ContactIntelInputs {
  lastTouchAt: Date | null;
  lastTouchType: string | null;
  touchFrequency30d: number;
  overdueTasksCount: number;
  unansweredInboundCount: number;
  sentiment?: number; // -1 to 1, optional
  contactType?: "personal" | "business";
  tags?: string[];
}

interface ContactIntelOutputs {
  relationshipScore: number; // 0-100
  trend30d: number; // -20 to +20
  drivers: string[]; // 3 plain English reasons
  riskFlags: string[];
  nextTouchDueAt: Date;
  suggestedNextActions: Array<{
    type: string;
    label: string;
    reason: string;
  }>;
  aiSummary: string; // Fallback template if LLM unavailable
}

export function computeContactIntel(inputs: ContactIntelInputs): ContactIntelOutputs {
  let score = 50; // Start at neutral
  const drivers: string[] = [];
  const riskFlags: string[] = [];
  const suggestedActions: Array<{ type: string; label: string; reason: string }> = [];

  // 1. Recency Score (0-30 points)
  if (inputs.lastTouchAt) {
    const daysSince = Math.floor(
      (Date.now() - inputs.lastTouchAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSince <= 1) {
      score += 20;
      drivers.push("Very recent interaction");
    } else if (daysSince <= 7) {
      score += 15;
      drivers.push("Touched within the week");
    } else if (daysSince <= 14) {
      score += 10;
      drivers.push("Touched within 2 weeks");
    } else if (daysSince <= 30) {
      score += 5;
      drivers.push("Touched within the month");
    } else {
      score -= 10;
      riskFlags.push(`No touch in ${daysSince} days`);
      suggestedActions.push({
        type: "followup",
        label: "Send follow-up",
        reason: `It's been ${daysSince} days since last touch`,
      });
    }
  } else {
    riskFlags.push("No interactions recorded");
    suggestedActions.push({
      type: "note",
      label: "Log first interaction",
      reason: "Start building the relationship memory",
    });
  }

  // 2. Touch Frequency (0-20 points)
  if (inputs.touchFrequency30d >= 4) {
    score += 20;
    drivers.push("High engagement (4+ touches/month)");
  } else if (inputs.touchFrequency30d >= 2) {
    score += 10;
    drivers.push("Regular engagement");
  } else if (inputs.touchFrequency30d === 1) {
    score += 5;
  } else if (inputs.touchFrequency30d === 0 && inputs.lastTouchAt) {
    score -= 5;
    riskFlags.push("No touches in last 30 days");
  }

  // 3. Open Loops (0-20 points penalty)
  if (inputs.overdueTasksCount > 0) {
    const penalty = Math.min(inputs.overdueTasksCount * 5, 20);
    score -= penalty;
    riskFlags.push(`${inputs.overdueTasksCount} overdue task${inputs.overdueTasksCount > 1 ? "s" : ""}`);
    suggestedActions.push({
      type: "task",
      label: "Close open loops",
      reason: `${inputs.overdueTasksCount} task${inputs.overdueTasksCount > 1 ? "s" : ""} need attention`,
    });
  }

  // 4. Unanswered Inbound (0-15 points penalty)
  if (inputs.unansweredInboundCount > 0) {
    const penalty = Math.min(inputs.unansweredInboundCount * 5, 15);
    score -= penalty;
    riskFlags.push(`${inputs.unansweredInboundCount} unanswered inbound email${inputs.unansweredInboundCount > 1 ? "s" : ""}`);
    suggestedActions.push({
      type: "followup",
      label: "Respond to inbound",
      reason: `${inputs.unansweredInboundCount} message${inputs.unansweredInboundCount > 1 ? "s" : ""} waiting for response`,
    });
  }

  // 5. Sentiment (optional, -10 to +10 points)
  if (inputs.sentiment !== undefined) {
    const sentimentPoints = Math.round(inputs.sentiment * 10);
    score += sentimentPoints;
    if (sentimentPoints > 5) {
      drivers.push("Positive sentiment in interactions");
    } else if (sentimentPoints < -5) {
      riskFlags.push("Negative sentiment detected");
    }
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Calculate trend (simplified: compare current score to baseline)
  // For now, set to 0 (stable) - can be enhanced with historical comparison
  const trend30d = 0;

  // Calculate next touch due date
  const nextTouchDueAt = (() => {
    if (inputs.lastTouchAt) {
      const baseInterval = inputs.contactType === "business" ? 7 : 14;
      return new Date(inputs.lastTouchAt.getTime() + baseInterval * 24 * 60 * 60 * 1000);
    }
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  })();

  // Generate AI summary (fallback template)
  const lastTouchText = inputs.lastTouchAt
    ? `${Math.floor((Date.now() - inputs.lastTouchAt.getTime()) / (1000 * 60 * 60 * 24))} days ago`
    : "never";
  
  const openLoopsText = inputs.overdueTasksCount > 0
    ? `${inputs.overdueTasksCount} overdue task${inputs.overdueTasksCount > 1 ? "s" : ""}`
    : "no open loops";
  
  const aiSummary = `You last interacted ${lastTouchText}${inputs.lastTouchType ? ` via ${inputs.lastTouchType}` : ""}. ${inputs.touchFrequency30d > 0 ? `Engagement: ${inputs.touchFrequency30d} touch${inputs.touchFrequency30d > 1 ? "es" : ""} in last 30 days.` : ""} Open loops: ${openLoopsText}. ${suggestedActions.length > 0 ? `Recommended: ${suggestedActions[0].label}.` : ""}`;

  return {
    relationshipScore: score,
    trend30d,
    drivers: drivers.slice(0, 3), // Top 3 drivers
    riskFlags,
    nextTouchDueAt,
    suggestedNextActions: suggestedActions.slice(0, 3), // Top 3 actions
    aiSummary,
  };
}

/**
 * Enhance with LLM if available (optional)
 */
export async function enhanceIntelWithLLM(
  baseIntel: ContactIntelOutputs,
  contactContext: {
    name: string;
    recentEvents: any[];
    facts: any[];
  }
): Promise<ContactIntelOutputs> {
  // If LLM route exists, call it here
  // For now, return base intel
  // TODO: Call /api/ai/contact-summary if available
  return baseIntel;
}

