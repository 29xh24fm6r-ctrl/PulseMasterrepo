// Future Self Model - Behavior Prediction & Trajectory Modeling
// lib/future-self/model.ts

import { getWorkCortexContextForUser } from "@/lib/cortex/context";
import { scanIdentity } from "@/lib/identity/v3";
import { runLifeSimulation } from "@/lib/simulation/v3/engine";
import { FutureSelfPrediction } from "./types";

/**
 * Generate future self prediction
 */
export async function generateFutureSelfPrediction(
  userId: string,
  horizonDays: number = 90
): Promise<FutureSelfPrediction> {
  const ctx = await getWorkCortexContextForUser(userId);
  const identityProfile = await scanIdentity(userId, ctx);

  // Run simulation for predictions
  const simulation = await runLifeSimulation({
    userId,
    horizonDays,
    scenarios: [
      {
        id: "future_self",
        title: "Future Self Trajectory",
        parameterAdjustments: {},
      },
    ],
    includeCausalModeling: true,
    includeChoiceModeling: true,
  });

  const scenario = simulation.scenarios[0];

  // Predict identity trajectory
  const identityTrajectory = predictIdentityTrajectory(identityProfile, horizonDays);

  // Predict habit drift
  const habitDrift = predictHabitDrift(ctx, horizonDays);

  // Predict relationship decay
  const relationshipDecay = predictRelationshipDecay(ctx, horizonDays);

  // Predict burnout probability
  const burnoutProbability = predictBurnoutProbability(ctx, scenario, horizonDays);

  // Predict motivation decay
  const motivationDecay = predictMotivationDecay(ctx, horizonDays);

  // Predict goal likelihood
  const goalLikelihood = predictGoalLikelihood(ctx, horizonDays);

  // Extract opportunity windows
  const opportunityWindows = extractOpportunityWindows(scenario, horizonDays);

  return {
    userId,
    generatedAt: new Date().toISOString(),
    horizon: horizonDays,
    identityTrajectory,
    habitDrift,
    relationshipDecay,
    burnoutProbability,
    motivationDecay,
    goalLikelihood,
    opportunityWindows,
  };
}

/**
 * Predict identity trajectory
 */
function predictIdentityTrajectory(
  identityProfile: any,
  horizonDays: number
): FutureSelfPrediction["identityTrajectory"] {
  const transformationArc = identityProfile.transformationArc;

  if (transformationArc) {
    return {
      currentArchetype: transformationArc.from,
      projectedArchetype: transformationArc.to,
      transitionProbability: transformationArc.progress + (1 - transformationArc.progress) * 0.7,
      transitionDate: new Date(
        Date.now() + (1 - transformationArc.progress) * horizonDays * 24 * 60 * 60 * 1000
      ).toISOString(),
      supportingFactors: identityProfile.strengths,
      blockingFactors: identityProfile.blindspots,
    };
  }

  return {
    currentArchetype: identityProfile.currentArchetype,
    projectedArchetype: identityProfile.currentArchetype,
    transitionProbability: 0.5,
    supportingFactors: identityProfile.strengths,
    blockingFactors: identityProfile.blindspots,
  };
}

/**
 * Predict habit drift
 */
function predictHabitDrift(ctx: any, horizonDays: number): FutureSelfPrediction["habitDrift"] {
  const habits = ctx.domains.life?.habits || [];
  const drift: FutureSelfPrediction["habitDrift"] = [];

  for (const habit of habits) {
    const currentStrength = habit.completionRate || 0.5;
    const streak = habit.streak || 0;

    // Calculate drift rate (habits with low streaks drift faster)
    const driftRate = streak < 7 ? 0.02 : streak < 30 ? 0.01 : 0.005; // per day

    // Project strength
    const projectedStrength = Math.max(0, currentStrength - driftRate * horizonDays);

    // Calculate decay date (when strength hits 0.2)
    const daysToDecay = (currentStrength - 0.2) / driftRate;
    const decayDate =
      daysToDecay > 0 && daysToDecay < horizonDays
        ? new Date(Date.now() + daysToDecay * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

    // Recovery probability (higher if habit was strong before)
    const recoveryProbability = currentStrength > 0.7 ? 0.8 : currentStrength > 0.5 ? 0.6 : 0.4;

    drift.push({
      habitId: habit.id,
      habitName: habit.name,
      currentStrength,
      projectedStrength,
      driftRate,
      decayDate,
      recoveryProbability,
    });
  }

  return drift;
}

/**
 * Predict relationship decay
 */
function predictRelationshipDecay(
  ctx: any,
  horizonDays: number
): FutureSelfPrediction["relationshipDecay"] {
  const relationships = ctx.domains.relationships?.keyPeople || [];
  const decay: FutureSelfPrediction["relationshipDecay"] = [];

  for (const person of relationships) {
    const daysSince = person.daysSinceInteraction || 0;
    const relationshipScore = person.relationshipScore || 50;

    // Predict decay
    let currentState: FutureSelfPrediction["relationshipDecay"][0]["currentState"] = "active";
    if (daysSince > 30) currentState = "neglected";
    else if (daysSince > 14) currentState = "cooling";

    let projectedState: FutureSelfPrediction["relationshipDecay"][0]["projectedState"] = "active";
    const projectedDaysSince = daysSince + horizonDays;

    if (projectedDaysSince > 90) {
      projectedState = "lost";
    } else if (projectedDaysSince > 60) {
      projectedState = "neglected";
    } else if (projectedDaysSince > 30) {
      projectedState = "cooling";
    }

    // Decay window (when relationship will significantly decay)
    if (projectedState !== "active" && currentState !== projectedState) {
      const decayStart = new Date(
        Date.now() + Math.max(0, 30 - daysSince) * 24 * 60 * 60 * 1000
      );
      const decayEnd = new Date(decayStart.getTime() + 30 * 24 * 60 * 60 * 1000);

      decay.push({
        personId: person.id,
        personName: person.name,
        currentState,
        projectedState,
        decayWindow: {
          start: decayStart.toISOString(),
          end: decayEnd.toISOString(),
        },
        preventDecayActions: [
          `Reach out to ${person.name} within 7 days`,
          `Schedule a meaningful interaction`,
          `Add ${person.name} to weekly relationship touches`,
        ],
      });
    }
  }

  return decay;
}

/**
 * Predict burnout probability
 */
function predictBurnoutProbability(
  ctx: any,
  scenario: any,
  horizonDays: number
): FutureSelfPrediction["burnoutProbability"] {
  const burnoutPatterns = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "burnout_cycle"
  );
  const currentProbability = burnoutPatterns.length > 0 ? 0.6 : 0.3;

  // Project trajectory
  const trajectory: Array<{ date: string; probability: number }> = [];
  for (let i = 0; i <= horizonDays; i += 7) {
    // Increase probability over time if current patterns continue
    const projected = Math.min(1, currentProbability + (i / horizonDays) * 0.3);
    trajectory.push({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
      probability: projected,
    });
  }

  const riskFactors: string[] = [];
  if (burnoutPatterns.length > 0) riskFactors.push("Historical burnout patterns");
  const workQueue = ctx.domains.work?.queue || [];
  if (workQueue.length > 15) riskFactors.push("High workload");
  if (ctx.emotion?.detected_emotion === "stressed") riskFactors.push("Current stress");

  return {
    current: currentProbability,
    projected: trajectory[trajectory.length - 1]?.probability || currentProbability,
    trajectory,
    riskFactors,
    mitigationStrategies: [
      "Reduce workload by 20%",
      "Schedule regular breaks",
      "Prioritize rest and recovery",
      "Set boundaries on work hours",
    ],
  };
}

/**
 * Predict motivation decay
 */
function predictMotivationDecay(
  ctx: any,
  horizonDays: number
): FutureSelfPrediction["motivationDecay"] {
  const current = ctx.emotion?.detected_emotion === "motivated" ? 0.8 : 0.5;
  const decayRate = 0.01; // per day (motivation naturally decays)

  const projected = Math.max(0.2, current - decayRate * horizonDays);

  return {
    current,
    projected,
    decayRate,
    recoveryTriggers: [
      "Complete a meaningful task",
      "Achieve a small win",
      "Reconnect with purpose",
      "Review your mission",
    ],
  };
}

/**
 * Predict goal likelihood
 */
function predictGoalLikelihood(
  ctx: any,
  horizonDays: number
): FutureSelfPrediction["goalLikelihood"] {
  const arcs = ctx.domains.strategy?.arcs || [];
  const likelihood: FutureSelfPrediction["goalLikelihood"] = [];

  for (const arc of arcs) {
    const currentProgress = arc.progress || 0;
    const progressRate = currentProgress / (arc.durationDays || 90); // per day
    const projectedProgress = Math.min(1, currentProgress + progressRate * horizonDays);
    const likelihoodScore = projectedProgress > 0.8 ? 0.9 : projectedProgress > 0.5 ? 0.7 : 0.4;

    const blockers: string[] = [];
    if (ctx.domains.work?.queue && ctx.domains.work.queue.length > 10) {
      blockers.push("High workload");
    }
    if (ctx.emotion?.detected_emotion === "stressed") {
      blockers.push("High stress");
    }

    const accelerators: string[] = [];
    if (ctx.emotion?.detected_emotion === "motivated") {
      accelerators.push("High motivation");
    }
    const productivityArcs = ctx.longitudinal.aggregatedPatterns.filter(
      (p) => p.type === "productivity_arc"
    );
    if (productivityArcs.length > 0) {
      accelerators.push("Productivity momentum");
    }

    const projectedCompletion =
      projectedProgress >= 1
        ? new Date(Date.now() + ((1 - currentProgress) / progressRate) * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

    likelihood.push({
      goalId: arc.id,
      goalTitle: arc.name,
      currentProgress,
      likelihood: likelihoodScore,
      blockers,
      accelerators,
      projectedCompletion,
    });
  }

  return likelihood;
}

/**
 * Extract opportunity windows from simulation
 */
function extractOpportunityWindows(
  scenario: any,
  horizonDays: number
): FutureSelfPrediction["opportunityWindows"] {
  const opportunities = scenario.opportunityWindows || [];
  const windows: FutureSelfPrediction["opportunityWindows"] = [];

  for (const opp of opportunities.slice(0, 5)) {
    windows.push({
      id: opp.id,
      title: opp.description,
      description: opp.description,
      window: {
        start: opp.startDate,
        end: opp.endDate,
      },
      probability: opp.priority === "high" ? 0.8 : opp.priority === "medium" ? 0.6 : 0.4,
      requiredActions: opp.suggestedActions || [],
      potentialImpact: opp.priority === "high" ? "high" : opp.priority === "medium" ? "medium" : "low",
    });
  }

  return windows;
}



