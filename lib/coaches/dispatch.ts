/**
 * Coach Dispatch System
 * Contextual coaches that appear when they add leverage
 * lib/coaches/dispatch.ts
 */

interface CoachContext {
  entity?: any;
  timeline?: any[];
  [key: string]: any;
}

interface CoachResult {
  name: string;
  note: string;
  confidence: number;
  expandable?: boolean;
}

/**
 * Dispatch appropriate coach based on context
 */
export async function dispatchCoach({
  surface,
  entityType,
  entityId,
  context,
  goal,
}: {
  surface: string;
  entityType?: "person" | "organization" | "deal";
  entityId?: string;
  context?: CoachContext;
  goal?: string;
}): Promise<CoachResult | null> {
  // Only dispatch coaches when they add real value
  // Default: return null (no coach)

  // Sales Coach for deals
  if (entityType === "deal" && context?.entity) {
    const deal = context.entity;
    const daysSinceUpdate = deal.updated_at
      ? Math.floor((Date.now() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    if (daysSinceUpdate > 7) {
      return {
        name: "Sales Coach",
        note: `This deal hasn't moved in ${daysSinceUpdate} days. Consider a strategic touchpoint to re-engage.`,
        confidence: 0.85,
        expandable: true,
      };
    }

    if (deal.stage === "proposal" || deal.stage === "negotiation") {
      return {
        name: "Sales Coach",
        note: "Critical stage. Ensure all decision-makers are engaged and objections are addressed.",
        confidence: 0.9,
        expandable: true,
      };
    }
  }

  // Relationship Coach for people
  if (entityType === "person" && context?.timeline) {
    const lastInteraction = context.timeline[0];
    if (lastInteraction) {
      const daysSince = Math.floor(
        (Date.now() - new Date(lastInteraction.occurred_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSince > 14 && daysSince < 30) {
        return {
          name: "Relationship Coach",
          note: "Relationship is cooling. A warm touchpoint now can maintain the connection.",
          confidence: 0.75,
          expandable: true,
        };
      }
    }
  }

  // Decision Coach (when goal is decision-related)
  if (goal === "decision" && context?.entity) {
    return {
      name: "Decision Coach",
      note: "Consider the long-term implications. What does your future self need?",
      confidence: 0.8,
      expandable: true,
    };
  }

  // No coach needed
  return null;
}

