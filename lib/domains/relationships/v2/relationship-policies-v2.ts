// Relationship Autonomy Policies v2
// lib/domains/relationships/v2/relationship-policies-v2.ts

import { registerPolicy, AutonomyPolicy, AutonomyAction } from "@/lib/cortex/autonomy/v3";
import { PulseCortexContext } from "@/lib/cortex/types";
import { buildRelationshipState } from "./relationship-state";
import { detectRelationshipRisks, detectOpportunities } from "./relationship-analyzer";
import { buildRelationshipPlan } from "./relationship-plan-builder";

/**
 * Policy: Neglect Spike (>30 days silence with important contact)
 */
const neglectSpikePolicy: AutonomyPolicy = {
  id: "relationships_v2:neglect_spike",
  domain: "relationships",
  name: "Relationship Neglect Spike",
  description: "Alert when important relationships go silent for 30+ days",
  priority: 15,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    if (!ctx.domains.relationships?.keyPeople) return actions;

    const neglected = ctx.domains.relationships.keyPeople.filter(
      (person) => person.relationshipScore > 70 && person.daysSinceInteraction > 30
    );

    // Note: buildRelationshipState is async, but policy evaluation is sync
    // For now, use available context data
    for (const person of neglected.slice(0, 5)) {

      // Calculate risk based on available data
      const riskScore = person.daysSinceInteraction > 60 ? "high" : "medium";
      
      if (person.daysSinceInteraction > 30) {
        actions.push({
          id: `rel_neglect_${person.id}`,
          domain: "relationships",
          title: `⚠️ Reconnect with ${person.name}`,
          description: `${person.daysSinceInteraction} days since last interaction. High-value relationship at risk.`,
          severity: riskScore === "high" ? "urgent" : "warning",
          requiresConfirmation: false,
          payload: {
            type: "relationship_nudge",
            personId: person.id,
            personName: person.name,
            suggestedAction: "reconnect",
            urgency: "high",
          },
          metadata: {
            daysSince: person.daysSinceInteraction,
            relationshipScore: person.relationshipScore,
            riskType: "neglect",
            // Note: Full state analysis would require async call
          },
        });
      }
    }

    return actions;
  },
};

/**
 * Policy: Opportunity Window (birthday, promotion, crisis, etc.)
 */
const opportunityWindowPolicy: AutonomyPolicy = {
  id: "relationships_v2:opportunity_window",
  domain: "relationships",
  name: "Relationship Opportunity Window",
  description: "Detect opportunities for relationship engagement",
  priority: 12,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    if (!ctx.domains.relationships?.keyPeople) return actions;

    for (const person of ctx.domains.relationships.keyPeople.slice(0, 10)) {
      // Check for reconnection window (30-60 days)
      if (person.daysSinceInteraction > 30 && person.daysSinceInteraction < 60) {
        actions.push({
          id: `rel_opp_${person.id}`,
          domain: "relationships",
          title: `🎯 Opportunity: Reconnect with ${person.name}`,
          description: `Reconnection window: ${person.daysSinceInteraction} days since last contact. Good time to reconnect.`,
          severity: person.relationshipScore > 70 ? "warning" : "info",
          requiresConfirmation: false,
          payload: {
            type: "relationship_plan",
            personId: person.id,
            personName: person.name,
            goal: "reconnect",
            suggestedAction: "initiate_reconnection_campaign",
          },
          metadata: {
            opportunityType: "reconnection_window",
            priority: person.relationshipScore > 70 ? "high" : "medium",
          },
        });
      }
    }

    return actions;
  },
};

/**
 * Policy: Repair Path Trigger (conflict detected)
 */
const repairPathTriggerPolicy: AutonomyPolicy = {
  id: "relationships_v2:repair_path",
  domain: "relationships",
  name: "Relationship Repair Path Trigger",
  description: "Detect conflicts and suggest repair sequences",
  priority: 18,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    if (!ctx.domains.relationships?.keyPeople) return actions;

    // Check for negative emotional associations in health scores
    for (const person of ctx.domains.relationships.keyPeople) {
      const healthScore = ctx.domains.relationships.healthScores.find(
        (h) => h.contactId === person.id
      );
      
      // Check if relationship is cooling or gone quiet (potential conflict indicator)
      if (healthScore && (healthScore.trend === "cooling" || healthScore.trend === "gone_quiet")) {
        // Note: Full repair plan would require async state building
        // For now, suggest repair action

        actions.push({
          id: `rel_repair_${person.id}`,
          domain: "relationships",
          title: `🔧 Repair relationship with ${person.name}`,
          description: `Relationship trend: ${healthScore.trend}. Consider repair sequence.`,
          severity: "urgent",
          requiresConfirmation: true,
          payload: {
            type: "relationship_repair",
            personId: person.id,
            personName: person.name,
            suggestedAction: "initiate_repair_sequence",
          },
          metadata: {
            riskType: "conflict",
            trend: healthScore.trend,
            // Full plan would be generated on action execution
          },
        });
      }
    }

    return actions;
  },
};

// Register all policies
registerPolicy(neglectSpikePolicy);
registerPolicy(opportunityWindowPolicy);
registerPolicy(repairPathTriggerPolicy);

