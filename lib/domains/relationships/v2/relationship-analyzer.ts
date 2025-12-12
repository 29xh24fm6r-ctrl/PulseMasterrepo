// Relationship Analyzer
// lib/domains/relationships/v2/relationship-analyzer.ts

import { RelationshipState, RelationshipScores, RelationshipRisk, RelationshipOpportunity } from "./types";

/**
 * Compute relationship scores
 */
export function computeRelationshipScores(state: RelationshipState): RelationshipScores {
  // Health: Based on recency, frequency, emotional association
  let health = 100;
  if (state.daysSinceInteraction > 30) health -= 30;
  if (state.daysSinceInteraction > 60) health -= 20;
  if (state.emotionalAssociation === "negative") health -= 20;
  if (state.emotionalAssociation === "positive") health += 10;
  health = Math.max(0, Math.min(100, health));

  // Engagement: Based on frequency pattern and recent activity
  let engagement = 50;
  if (state.frequencyPattern === "daily") engagement = 90;
  else if (state.frequencyPattern === "weekly") engagement = 70;
  else if (state.frequencyPattern === "monthly") engagement = 50;
  else if (state.frequencyPattern === "quarterly") engagement = 30;
  else engagement = 20;

  if (state.daysSinceInteraction < 7) engagement += 10;
  if (state.daysSinceInteraction > 30) engagement -= 20;

  engagement = Math.max(0, Math.min(100, engagement));

  // Value: Based on importance score and relationship score
  const value = (state.importanceScore + state.relationshipScore) / 2;

  // Urgency: Based on risk and opportunity
  const urgency = Math.max(state.riskScore, state.opportunityScore);

  return {
    health,
    engagement,
    value,
    urgency,
  };
}

/**
 * Detect relationship risks
 */
export function detectRelationshipRisks(state: RelationshipState): RelationshipRisk[] {
  const risks: RelationshipRisk[] = [];

  // Neglect risk
  if (state.daysSinceInteraction > 30 && state.importanceScore > 70) {
    risks.push({
      id: `risk_neglect_${state.personId}`,
      type: "neglect",
      severity: state.daysSinceInteraction > 60 ? "high" : "medium",
      description: `High-value relationship (${state.importanceScore} importance) has been neglected for ${state.daysSinceInteraction} days`,
      recommendedAction: "Initiate reconnection sequence",
      metadata: { daysSince: state.daysSinceInteraction, importanceScore: state.importanceScore },
    });
  }

  // Gone quiet risk
  if (state.daysSinceInteraction > 90) {
    risks.push({
      id: `risk_gone_quiet_${state.personId}`,
      type: "gone_quiet",
      severity: "high",
      description: `Relationship has gone quiet: ${state.daysSinceInteraction} days since last contact`,
      recommendedAction: "Consider relationship repair sequence",
      metadata: { daysSince: state.daysSinceInteraction },
    });
  }

  // Cooling risk
  if (
    state.daysSinceInteraction > 14 &&
    state.daysSinceInteraction < 60 &&
    state.frequencyPattern === "weekly"
  ) {
    risks.push({
      id: `risk_cooling_${state.personId}`,
      type: "cooling",
      severity: "medium",
      description: "Relationship frequency is decreasing",
      recommendedAction: "Increase engagement to maintain connection",
      metadata: { frequencyPattern: state.frequencyPattern },
    });
  }

  // Conflict risk (from emotional association)
  if (state.emotionalAssociation === "negative" && state.history.length > 0) {
    const recentNegative = state.history.filter(
      (e) => e.emotion === "stressed" || e.emotion === "angry"
    );
    if (recentNegative.length > 0) {
      risks.push({
        id: `risk_conflict_${state.personId}`,
        type: "conflict",
        severity: "high",
        description: "Negative emotional association detected. Potential conflict or unresolved issue.",
        recommendedAction: "Address conflict through repair sequence",
        metadata: { negativeEventCount: recentNegative.length },
      });
    }
  }

  return risks;
}

/**
 * Detect relationship opportunities
 */
export function detectOpportunities(state: RelationshipState): RelationshipOpportunity[] {
  const opportunities: RelationshipOpportunity[] = [];

  // Reconnection window
  if (state.daysSinceInteraction > 30 && state.daysSinceInteraction < 60) {
    opportunities.push({
      id: `opp_reconnection_${state.personId}`,
      type: "reconnection_window",
      priority: state.importanceScore > 70 ? "high" : "medium",
      description: `Reconnection window: ${state.daysSinceInteraction} days since last contact. Good time to reconnect.`,
      suggestedAction: "Initiate reconnection campaign",
      metadata: { daysSince: state.daysSinceInteraction },
    });
  }

  // Strategic value building
  if (state.importanceScore > 60 && state.daysSinceInteraction < 14) {
    opportunities.push({
      id: `opp_strategic_${state.personId}`,
      type: "strategic_value",
      priority: "medium",
      description: "Active high-value relationship. Opportunity to strengthen connection.",
      suggestedAction: "Build strategic value through deeper engagement",
      metadata: { importanceScore: state.importanceScore },
    });
  }

  // Birthday/milestone opportunities (would need calendar integration)
  // Placeholder for future enhancement

  return opportunities;
}



