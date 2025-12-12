// Relationship Agent - Relationship health and check-ins
// lib/agi/agents/relationshipAgent.ts

import { Agent, makeAgentResult } from "../agents";
import { AgentContext, AGIAction } from "../types";

export const relationshipAgent: Agent = {
  name: "RelationshipAgent",
  description: "Manages relationship health, check-ins, and at-risk connections.",
  priority: 70,

  async run(ctx: AgentContext) {
    const actions: AGIAction[] = [];
    const { world } = ctx;

    // Use relationship perception data
    const atRisk = world.relationships.atRiskRelationships || [];
    const checkinsDue = world.relationships.checkinsDue || [];
    const importantContacts = world.relationships.importantContacts || [];
    const relationshipDrift = world.relationships.relationshipDrift;

    // At-risk relationships need attention
    const atRiskCount = atRisk.length;
    if (atRiskCount > 0) {
      const driftScore = relationshipDrift || 0;
      actions.push({
        type: "update_relationship_plan",
        label: `Create repair plan for ${atRiskCount} at-risk relationship${atRiskCount > 1 ? "s" : ""}`,
        details: {
          atRiskCount,
          relationships: atRisk,
          domain: "relationships",
          driftScore,
        },
        requiresConfirmation: true,
        riskLevel: driftScore > 0.7 ? "high" : "medium",
      });
    }

    // Overall relationship drift warning
    if (relationshipDrift !== undefined && relationshipDrift > 0.5 && atRiskCount === 0) {
      // Drift detected but not yet at-risk - early warning
      actions.push({
        type: "log_insight",
        label: "Relationship drift detected",
        details: {
          insight: "Some relationships are showing signs of drift. Consider proactive check-ins.",
          priority: "low",
          domain: "relationships",
        },
        requiresConfirmation: false,
        riskLevel: "low",
      });
    }

    // Check-ins due
    const checkinsCount = checkinsDue.length;
    if (checkinsCount > 0) {
      actions.push({
        type: "create_task",
        label: `Schedule ${checkinsCount} relationship check-in${checkinsCount > 1 ? "s" : ""}`,
        details: {
          title: "Relationship check-ins",
          when: "this_week",
          domain: "relationships",
          metadata: { checkinsCount },
        },
        requiresConfirmation: false,
        riskLevel: "low",
      });
    }

    // Important contacts without recent interaction
    const staleImportant = importantContacts.filter((c: any) => {
      if (!c.lastInteraction) return true;
      const daysSince = Math.floor(
        (Date.now() - new Date(c.lastInteraction).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSince > 30;
    });

    if (staleImportant.length > 0) {
      actions.push({
        type: "nudge_user",
        label: `Reconnect with ${staleImportant.length} important contact${staleImportant.length > 1 ? "s" : ""}`,
        details: {
          message: `You haven't connected with ${staleImportant.length} important contact(s) in over 30 days.`,
          contacts: staleImportant.map((c: any) => c.name || c.contact_name),
          domain: "relationships",
        },
        requiresConfirmation: false,
        riskLevel: "low",
      });
    }

    const reasoning =
      atRiskCount > 0
        ? `${atRiskCount} relationship(s) are at risk and need attention${relationshipDrift !== undefined ? ` (drift score: ${Math.round(relationshipDrift * 100)}%)` : ""}.`
        : checkinsCount > 0
        ? `${checkinsCount} relationship check-in(s) are due.`
        : staleImportant.length > 0
        ? `${staleImportant.length} important contact(s) haven't been reached in 30+ days.`
        : relationshipDrift !== undefined && relationshipDrift > 0.5
        ? `Relationship drift detected (${Math.round(relationshipDrift * 100)}%).`
        : "Relationship health is stable.";

    const confidence =
      atRiskCount > 0 ? 0.9 : checkinsCount > 0 ? 0.8 : staleImportant.length > 0 ? 0.7 : relationshipDrift !== undefined && relationshipDrift > 0.5 ? 0.6 : 0.4;

    return makeAgentResult("RelationshipAgent", reasoning, actions, confidence);
  },
};

