// Causal Modeling for Simulation Engine v3
// lib/simulation/v3/causal-modeling.ts

import { PulseCortexContext } from "@/lib/cortex/types";
import { CausalInsight } from "./types";

/**
 * Detect causal relationships in user's life
 */
export function detectCausalRelationships(ctx: PulseCortexContext): CausalInsight[] {
  const insights: CausalInsight[] = [];

  // Emotional → Productivity
  if (ctx.emotion) {
    const emotion = ctx.emotion.detected_emotion;
    const intensity = ctx.emotion.intensity;

    if ((emotion === "stressed" || emotion === "overwhelmed") && intensity > 0.7) {
      insights.push({
        cause: "high_stress_emotion",
        effect: "productivity_decline",
        strength: intensity,
        delay: 1, // Immediate effect
        description: "High stress leads to productivity decline within 1 day",
      });
    }

    if (emotion === "motivated" && intensity > 0.7) {
      insights.push({
        cause: "high_motivation",
        effect: "productivity_increase",
        strength: intensity,
        delay: 0,
        description: "High motivation leads to immediate productivity boost",
      });
    }
  }

  // Relationships → Career
  const relationships = ctx.domains.relationships?.keyPeople || [];
  const activeRelationships = relationships.filter((p) => p.daysSinceInteraction < 7);
  if (activeRelationships.length > 5) {
    insights.push({
      cause: "high_relationship_engagement",
      effect: "career_opportunities",
      strength: 0.6,
      delay: 14, // 2 weeks
      description: "Active relationship engagement creates career opportunities within 2 weeks",
    });
  }

  // Financial Stress → Health Decline
  const financialStress = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "financial_stress_window"
  );
  if (financialStress.length > 0) {
    insights.push({
      cause: "financial_stress",
      effect: "health_decline",
      strength: 0.7,
      delay: 30, // 1 month
      description: "Financial stress leads to health decline within 1 month",
    });
  }

  // Burnout → Relationship Neglect
  const burnoutPatterns = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "burnout_cycle"
  );
  if (burnoutPatterns.length > 0) {
    insights.push({
      cause: "burnout",
      effect: "relationship_neglect",
      strength: 0.8,
      delay: 7, // 1 week
      description: "Burnout leads to relationship neglect within 1 week",
    });
  }

  // Productivity Arc → Career Growth
  const productivityArcs = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "productivity_arc"
  );
  if (productivityArcs.length > 0) {
    insights.push({
      cause: "sustained_productivity",
      effect: "career_growth",
      strength: 0.7,
      delay: 60, // 2 months
      description: "Sustained productivity leads to career growth within 2 months",
    });
  }

  // Habit Formation → Identity Shift
  const habits = ctx.domains.life?.habits || [];
  const strongHabits = habits.filter((h) => h.completionRate > 0.8 && h.streak > 14);
  if (strongHabits.length > 3) {
    insights.push({
      cause: "habit_consistency",
      effect: "identity_strengthening",
      strength: 0.6,
      delay: 30, // 1 month
      description: "Habit consistency leads to identity strengthening within 1 month",
    });
  }

  return insights;
}

/**
 * Apply causal modeling to trajectory prediction
 */
export function applyCausalModeling(
  baseTrajectory: "improving" | "declining" | "stable" | "volatile",
  causalInsights: CausalInsight[],
  daysAhead: number
): {
  adjustedTrajectory: "improving" | "declining" | "stable" | "volatile";
  causalFactors: string[];
} {
  let trajectory = baseTrajectory;
  const factors: string[] = [];

  for (const insight of causalInsights) {
    if (insight.delay <= daysAhead) {
      // Effect will manifest within time horizon
      if (insight.effect.includes("decline") || insight.effect.includes("neglect")) {
        if (trajectory === "stable") trajectory = "declining";
        if (trajectory === "improving") trajectory = "stable";
        factors.push(insight.description);
      } else if (insight.effect.includes("increase") || insight.effect.includes("growth")) {
        if (trajectory === "stable") trajectory = "improving";
        if (trajectory === "declining") trajectory = "stable";
        factors.push(insight.description);
      }
    }
  }

  return {
    adjustedTrajectory: trajectory,
    causalFactors: factors,
  };
}



