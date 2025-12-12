// Trajectory Functions for Simulation Engine
// lib/simulation/v2/trajectories.ts

import { PulseCortexContext } from "@/lib/cortex/types";
import { PredictedArc } from "./types";

/**
 * Predict productivity trajectory
 */
export function productivityTrajectory(
  ctx: PulseCortexContext,
  horizonDays: number
): PredictedArc | null {
  // Use longitudinal patterns to predict
  const productivityPatterns = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "productivity_arc"
  );

  if (productivityPatterns.length === 0) {
    // No pattern data, use current state
    const currentQueue = ctx.domains.work?.queue || [];
    const trajectory: PredictedArc["trajectory"] =
      currentQueue.length > 10 ? "declining" : currentQueue.length > 5 ? "stable" : "improving";

    return {
      domain: "work",
      type: "productivity",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000).toISOString(),
      trajectory,
      confidence: 0.5,
      description: `Productivity trajectory: ${trajectory} based on current queue size`,
    };
  }

  // Use pattern to predict
  const pattern = productivityPatterns[0];
  const isActive = !pattern.endDate || new Date(pattern.endDate) > new Date();
  const trajectory: PredictedArc["trajectory"] = isActive && pattern.strength > 0.7
    ? "improving"
    : "stable";

  return {
    domain: "work",
    type: "productivity",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000).toISOString(),
    trajectory,
    confidence: pattern.strength,
    description: `Productivity arc: ${pattern.description}`,
    metadata: { patternId: pattern.id },
  };
}

/**
 * Predict emotional trajectory
 */
export function emotionalTrajectory(
  ctx: PulseCortexContext,
  horizonDays: number
): PredictedArc | null {
  if (!ctx.emotion) return null;

  const emotion = ctx.emotion.detected_emotion;
  const intensity = ctx.emotion.intensity;

  // Check for emotion cycles
  const emotionCycles = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "emotion_cycle"
  );

  let trajectory: PredictedArc["trajectory"] = "stable";
  let confidence = 0.5;

  if (emotionCycles.length > 0) {
    const cycle = emotionCycles[0];
    trajectory = cycle.strength > 0.7 ? "volatile" : "stable";
    confidence = cycle.strength;
  } else {
    // Predict based on current state
    if (emotion === "stressed" || emotion === "overwhelmed") {
      trajectory = intensity > 0.8 ? "declining" : "stable";
    } else if (emotion === "motivated" || emotion === "excited") {
      trajectory = intensity > 0.7 ? "improving" : "stable";
    }
  }

  return {
    domain: "life",
    type: "emotional",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000).toISOString(),
    trajectory,
    confidence,
    description: `Emotional trajectory: ${trajectory} based on current state (${emotion})`,
    metadata: { currentEmotion: emotion, intensity },
  };
}

/**
 * Predict relationship trajectory
 */
export function relationshipTrajectory(
  ctx: PulseCortexContext,
  horizonDays: number
): PredictedArc | null {
  const relationships = ctx.domains.relationships;
  if (!relationships?.keyPeople || relationships.keyPeople.length === 0) return null;

  // Calculate average health
  const avgDaysSince = relationships.keyPeople.reduce(
    (sum, p) => sum + p.daysSinceInteraction,
    0
  ) / relationships.keyPeople.length;

  const trajectory: PredictedArc["trajectory"] =
    avgDaysSince > 30 ? "declining" : avgDaysSince > 14 ? "stable" : "improving";

  return {
    domain: "relationships",
    type: "relationship",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000).toISOString(),
    trajectory,
    confidence: 0.6,
    description: `Relationship trajectory: ${trajectory} (avg ${Math.round(avgDaysSince)} days since contact)`,
    metadata: { avgDaysSince, relationshipCount: relationships.keyPeople.length },
  };
}

/**
 * Predict financial trajectory
 */
export function financialTrajectory(
  ctx: PulseCortexContext,
  horizonDays: number
): PredictedArc | null {
  const finance = ctx.domains.finance;
  if (!finance) return null;

  // Check cashflow projection
  if (finance.cashflowProjection) {
    const trajectory: PredictedArc["trajectory"] =
      finance.cashflowProjection.trend === "negative"
        ? "declining"
        : finance.cashflowProjection.trend === "positive"
        ? "improving"
        : "stable";

    return {
      domain: "finance",
      type: "financial",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000).toISOString(),
      trajectory,
      confidence: 0.7,
      description: `Financial trajectory: ${trajectory} (${finance.cashflowProjection.trend} cashflow)`,
      metadata: {
        cashflowTrend: finance.cashflowProjection.trend,
        next30Days: finance.cashflowProjection.next30Days,
      },
    };
  }

  // Check for financial stress patterns
  const stressPatterns = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "financial_stress_window"
  );

  if (stressPatterns.length > 0) {
    const pattern = stressPatterns[0];
    return {
      domain: "finance",
      type: "financial",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000).toISOString(),
      trajectory: "declining",
      confidence: pattern.strength,
      description: `Financial stress pattern detected: ${pattern.description}`,
      metadata: { patternId: pattern.id },
    };
  }

  return null;
}

/**
 * Predict habit trajectory
 */
export function habitTrajectory(
  ctx: PulseCortexContext,
  horizonDays: number
): PredictedArc | null {
  const life = ctx.domains.life;
  if (!life?.habits || life.habits.length === 0) return null;

  // Calculate average completion rate
  const avgCompletion = life.habits.reduce((sum, h) => sum + h.completionRate, 0) /
    life.habits.length;

  // Check for habit bursts
  const habitBursts = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "habit_burst"
  );

  let trajectory: PredictedArc["trajectory"] = "stable";
  let confidence = 0.5;

  if (habitBursts.length > 0) {
    const burst = habitBursts[0];
    const isRecent = new Date(burst.startDate).getTime() >
      Date.now() - 7 * 24 * 60 * 60 * 1000;

    if (isRecent && burst.strength > 0.7) {
      trajectory = "improving";
      confidence = burst.strength;
    }
  } else {
    trajectory = avgCompletion > 0.7 ? "improving" : avgCompletion < 0.5 ? "declining" : "stable";
    confidence = 0.6;
  }

  return {
    domain: "life",
    type: "habit",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000).toISOString(),
    trajectory,
    confidence,
    description: `Habit trajectory: ${trajectory} (avg ${Math.round(avgCompletion * 100)}% completion)`,
    metadata: { avgCompletion, habitCount: life.habits.length },
  };
}



