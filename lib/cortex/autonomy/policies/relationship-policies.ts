// Relationships Domain Autonomy Policies v3
// lib/cortex/autonomy/policies/relationship-policies.ts

import { registerPolicy, AutonomyPolicy, AutonomyAction } from "../v3";
import { PulseCortexContext } from "../../types";
import { PulseCortexContext } from "../../types";

/**
 * Policy: Relationship Neglect Spike
 */
const relationshipNeglectPolicy: AutonomyPolicy = {
  id: "relationships:neglect_spike",
  domain: "relationships",
  name: "Relationship Neglect Spike",
  description: "Alert when high-value relationships are being neglected",
  priority: 15,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    if (!ctx.domains.relationships?.keyPeople) return actions;

    const neglected = ctx.domains.relationships.keyPeople.filter(
      (person) =>
        person.relationshipScore > 70 && person.daysSinceInteraction > 14
    );

    for (const person of neglected.slice(0, 5)) {
      actions.push({
        id: `relationship_nudge_${person.id}`,
        domain: "relationships",
        title: `Reconnect with ${person.name}`,
        description: `${person.daysSinceInteraction} days since last interaction`,
        severity: person.daysSinceInteraction > 30 ? "warning" : "info",
        payload: {
          type: "relationship_nudge",
          contactId: person.id,
          contactName: person.name,
          suggestedAction: "check_in",
          urgency: person.daysSinceInteraction > 30 ? "high" : "medium",
        },
        metadata: {
          relationshipScore: person.relationshipScore,
          daysSince: person.daysSinceInteraction,
        },
      });
    }

    return actions;
  },
};

/**
 * Policy: Financial Stress Pattern Match
 */
const financialStressPatternPolicy: AutonomyPolicy = {
  id: "relationships:financial_stress_pattern",
  domain: "relationships",
  name: "Financial Stress Pattern Match",
  description: "Detect when financial stress affects relationships",
  priority: 12,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    const financialStressPatterns = ctx.longitudinal.aggregatedPatterns.filter(
      (p) => p.type === "financial_stress_window"
    );

    if (financialStressPatterns.length > 0) {
      const recentPattern = financialStressPatterns[0];
      const isActive =
        !recentPattern.endDate || new Date(recentPattern.endDate) > new Date();

      if (isActive) {
        actions.push({
          id: "financial_stress_relationship_alert",
          domain: "relationships",
          title: "Financial Stress Affecting Relationships",
          description: "Financial stress patterns detected. Consider transparent communication with key relationships.",
          severity: "warning",
          payload: {
            type: "financial_stress_relationship",
            suggestedAction: "transparent_communication",
            patternStrength: recentPattern.strength,
          },
          metadata: {
            patternId: recentPattern.id,
          },
        });
      }
    }

    return actions;
  },
};

// Register all policies
registerPolicy(relationshipNeglectPolicy);
registerPolicy(financialStressPatternPolicy);

