// Relationships Domain Autonomy Policies
// lib/domains/relationships/autonomy.ts

import { registerAutonomyPolicy, AutonomyPolicy, AutonomyAction } from "@/lib/cortex/autonomy";
import { PulseCortexContext } from "@/lib/cortex/types";

/**
 * Policy: Cold Top Relationship
 * Detects when a high-value relationship has gone cold
 */
const coldTopRelationshipPolicy: AutonomyPolicy = {
  id: "relationships:cold_top",
  domain: "relationships",
  name: "Cold Top Relationship",
  description: "Alert when high-value relationships go cold",
  isEnabled: true,
  priority: 10,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    if (!ctx.domains.relationships?.keyPeople) return actions;

    const coldRelationships = ctx.domains.relationships.keyPeople.filter(
      (person) =>
        person.relationshipScore > 70 && person.daysSinceInteraction > 14
    );

    for (const person of coldRelationships.slice(0, 3)) {
      actions.push({
        id: `relationship_nudge_${person.id}`,
        domain: "relationships",
        title: `Reconnect with ${person.name}`,
        description: `${person.daysSinceInteraction} days since last interaction`,
        riskLevel: "low",
        requiresConfirmation: false,
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
 * Policy: High-Risk Relationship Neglect
 * Detects when critical relationships are at risk
 */
const highRiskNeglectPolicy: AutonomyPolicy = {
  id: "relationships:high_risk_neglect",
  domain: "relationships",
  name: "High-Risk Relationship Neglect",
  description: "Alert when critical relationships are being neglected",
  isEnabled: true,
  priority: 15,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    if (!ctx.domains.relationships?.keyPeople) return actions;

    const atRisk = ctx.domains.relationships.keyPeople.filter(
      (person) =>
        person.relationshipScore > 80 && person.daysSinceInteraction > 30
    );

    for (const person of atRisk) {
      actions.push({
        id: `relationship_repair_${person.id}`,
        domain: "relationships",
        title: `⚠️ Repair relationship with ${person.name}`,
        description: `High-value relationship (score: ${person.relationshipScore}) has been neglected for ${person.daysSinceInteraction} days`,
        riskLevel: "high",
        requiresConfirmation: true,
        payload: {
          type: "relationship_repair",
          contactId: person.id,
          contactName: person.name,
          suggestedAction: "reconnect_apology",
          urgency: "high",
        },
        metadata: {
          relationshipScore: person.relationshipScore,
          daysSince: person.daysSinceInteraction,
          riskLevel: "high",
        },
      });
    }

    return actions;
  },
};

/**
 * Policy: Birthday / Milestone Nudges
 * Suggests celebrating important milestones
 */
const milestoneNudgesPolicy: AutonomyPolicy = {
  id: "relationships:milestones",
  domain: "relationships",
  name: "Birthday / Milestone Nudges",
  description: "Suggest celebrating birthdays and milestones",
  isEnabled: true,
  priority: 5,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    // TODO: Integrate with calendar/birthday tracking
    // For now, this is a placeholder

    return actions;
  },
};

// Register all policies
registerAutonomyPolicy(coldTopRelationshipPolicy);
registerAutonomyPolicy(highRiskNeglectPolicy);
registerAutonomyPolicy(milestoneNudgesPolicy);



