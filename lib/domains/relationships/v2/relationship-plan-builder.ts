// Relationship Plan Builder (Using EF v3)
// lib/domains/relationships/v2/relationship-plan-builder.ts

import { RelationshipState, RelationshipPlan } from "./types";
import { PulseCortexContext } from "@/lib/cortex/types";
import { generateMicroPlan } from "@/lib/cortex/executive";
import { PulseObjective } from "@/lib/cortex/executive";

/**
 * Build relationship plan using Executive Function v3
 */
export function buildRelationshipPlan(
  state: RelationshipState,
  ctx: PulseCortexContext,
  goal: RelationshipPlan["goal"] = "reconnect"
): RelationshipPlan {
  // Create objective based on goal
  const objective: PulseObjective = {
    id: `rel_${goal}_${state.personId}`,
    domain: "relationships",
    title: getGoalTitle(goal, state.personName),
    description: getGoalDescription(goal, state),
    importance: state.importanceScore,
    urgency: state.riskScore,
    estimatedMinutes: getGoalEstimatedMinutes(goal),
    metadata: {
      personId: state.personId,
      personName: state.personName,
      goal,
      daysSince: state.daysSinceInteraction,
    },
  };

  // Generate micro-plan using EF v3
  const microPlan = generateMicroPlan([objective], ctx);

  // Define success criteria
  const successCriteria = getSuccessCriteria(goal, state);

  return {
    id: `plan_${state.personId}_${Date.now()}`,
    personId: state.personId,
    personName: state.personName,
    goal,
    microPlan,
    estimatedDuration: Math.ceil(microPlan.estimatedTotalMinutes / (60 * 24)), // Convert to days
    successCriteria,
    metadata: {
      relationshipScore: state.relationshipScore,
      riskScore: state.riskScore,
      opportunityScore: state.opportunityScore,
    },
  };
}

/**
 * Get goal title
 */
function getGoalTitle(goal: RelationshipPlan["goal"], personName: string): string {
  switch (goal) {
    case "reconnect":
      return `Reconnect with ${personName}`;
    case "repair":
      return `Repair relationship with ${personName}`;
    case "strengthen":
      return `Strengthen connection with ${personName}`;
    case "strategic_value":
      return `Build strategic value with ${personName}`;
    case "maintain":
      return `Maintain relationship with ${personName}`;
  }
}

/**
 * Get goal description
 */
function getGoalDescription(goal: RelationshipPlan["goal"], state: RelationshipState): string {
  switch (goal) {
    case "reconnect":
      return `Reconnect after ${state.daysSinceInteraction} days of silence. Rebuild rapport and re-establish connection.`;
    case "repair":
      return `Repair relationship that has negative associations. Address conflicts and rebuild trust.`;
    case "strengthen":
      return `Deepen existing connection. Move from transactional to relational.`;
    case "strategic_value":
      return `Build strategic value in high-importance relationship. Create mutual benefit.`;
    case "maintain":
      return `Maintain healthy relationship. Keep connection warm and active.`;
  }
}

/**
 * Get estimated minutes for goal
 */
function getGoalEstimatedMinutes(goal: RelationshipPlan["goal"]): number {
  switch (goal) {
    case "reconnect":
      return 30; // Quick check-in
    case "repair":
      return 60; // Longer conversation needed
    case "strengthen":
      return 45; // Meaningful interaction
    case "strategic_value":
      return 90; // Strategic conversation
    case "maintain":
      return 15; // Quick touchpoint
  }
}

/**
 * Get success criteria for goal
 */
function getSuccessCriteria(
  goal: RelationshipPlan["goal"],
  state: RelationshipState
): string[] {
  switch (goal) {
    case "reconnect":
      return [
        "Initiate contact within 7 days",
        "Receive positive response",
        "Schedule follow-up interaction",
      ];
    case "repair":
      return [
        "Acknowledge past issues",
        "Have open conversation",
        "Establish path forward",
      ];
    case "strengthen":
      return [
        "Have meaningful conversation",
        "Identify mutual interests",
        "Plan future interaction",
      ];
    case "strategic_value":
      return [
        "Identify mutual value opportunities",
        "Create concrete next steps",
        "Establish ongoing engagement",
      ];
    case "maintain":
      return [
        "Touch base within frequency pattern",
        "Keep connection warm",
        "Maintain positive association",
      ];
  }
}



