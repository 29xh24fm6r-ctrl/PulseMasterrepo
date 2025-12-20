// Executive Function v3 - Enhanced Domain-Agnostic Planning
// lib/cortex/executive/ef.ts

import { DomainKey, PulseCortexContext } from "../types";
import type { PulseObjective, MicroStep } from "../executive";

export interface MicroPlan {
  id: string;
  objectives: PulseObjective[];
  microSteps: MicroStep[];
  estimatedTotalMinutes: number;
  timeBlocks: Array<{
    startTime: string;
    duration: number;
    steps: MicroStep[];
  }>;
  generatedAt: string;
}

/**
 * Generate micro-plan from high-level objectives across domains
 */
export function generateMicroPlan(
  objectives: PulseObjective[],
  ctx: PulseCortexContext
): MicroPlan {
  const microSteps: MicroStep[] = [];

  // Break each objective into micro-steps
  for (const objective of objectives) {
    const steps = breakObjectiveIntoSteps(objective, ctx);
    microSteps.push(...steps);
  }

  // Sequence steps optimally
  const sequenced = sequenceMicroSteps(
    microSteps,
    ctx,
    ctx.cognitiveProfile.deepWorkCapacity * 60 // Convert to minutes
  );

  // Group into time blocks
  const timeBlocks = groupIntoTimeBlocks(sequenced, ctx);

  const totalMinutes = microSteps.reduce(
    (sum, step) => sum + step.estimatedMinutes,
    0
  );

  return {
    id: `plan_${Date.now()}`,
    objectives,
    microSteps: sequenced,
    estimatedTotalMinutes: totalMinutes,
    timeBlocks,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Break objective into steps (enhanced with longitudinal context)
 */
function breakObjectiveIntoSteps(
  objective: PulseObjective,
  ctx: PulseCortexContext
): MicroStep[] {
  // Use longitudinal patterns to inform breakdown
  const relevantPatterns = ctx.longitudinal.aggregatedPatterns.filter(
    (p) =>
      p.type === "productivity_arc" ||
      p.type === "procrastination_cycle" ||
      p.type === "burnout_cycle"
  );

  // Check if user has procrastination patterns for this domain
  const hasProcrastinationPattern = relevantPatterns.some(
    (p) => p.type === "procrastination_cycle"
  );

  // If procrastination pattern exists, make steps smaller
  const stepMultiplier = hasProcrastinationPattern ? 0.7 : 1.0;

  const needsBreakdown =
    (objective.estimatedMinutes && objective.estimatedMinutes > 20) ||
    objective.importance > 70 ||
    objective.urgency > 80;

  if (!needsBreakdown) {
    return [
      {
        id: `${objective.id}_step_1`,
        objectiveId: objective.id,
        domain: objective.domain,
        title: objective.title,
        estimatedMinutes: Math.round((objective.estimatedMinutes || 15) * stepMultiplier),
        energyRequired: estimateEnergyRequired(objective, ctx),
        source: "ef_generated",
        order: 1,
        metadata: objective.metadata,
      },
    ];
  }

  // Generate 3-7 micro-steps
  const baseStepCount = Math.min(
    7,
    Math.max(3, Math.ceil((objective.estimatedMinutes || 30) / 10))
  );
  const stepCount = Math.max(3, Math.round(baseStepCount * stepMultiplier));
  const steps: MicroStep[] = [];

  const stepTitles = generateStepTitles(objective, stepCount, ctx);
  const minutesPerStep = Math.ceil(
    ((objective.estimatedMinutes || 30) * stepMultiplier) / stepCount
  );

  for (let i = 0; i < stepCount; i++) {
    steps.push({
      id: `${objective.id}_step_${i + 1}`,
      objectiveId: objective.id,
      domain: objective.domain,
      title: stepTitles[i] || `Step ${i + 1}`,
      estimatedMinutes: minutesPerStep,
      energyRequired:
        i === 0
          ? "medium"
          : i === stepCount - 1
          ? "low"
          : "low",
      source: "ef_generated",
      order: i + 1,
      metadata: {
        ...objective.metadata,
        stepNumber: i + 1,
        totalSteps: stepCount,
      },
    });
  }

  return steps;
}

/**
 * Sequence micro-steps with longitudinal awareness
 * Re-exported from base executive module
 */
export function sequenceMicroSteps(
  steps: MicroStep[],
  ctx: PulseCortexContext,
  timeBudgetMinutes: number
): MicroStep[] {
  let remainingMinutes = timeBudgetMinutes;
  const sequenced: MicroStep[] = [];

  // Group by energy requirement
  const lowEnergy = steps.filter((s) => s.energyRequired === "low");
  const mediumEnergy = steps.filter((s) => s.energyRequired === "medium");
  const highEnergy = steps.filter((s) => s.energyRequired === "high");

  // Check longitudinal patterns for optimal sequencing
  const burnoutPatterns = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "burnout_cycle"
  );
  const isInBurnoutWindow = burnoutPatterns.some((p) => {
    if (!p.endDate) return false;
    const end = new Date(p.endDate).getTime();
    return Date.now() - end < 7 * 24 * 60 * 60 * 1000; // Within 7 days of burnout
  });

  const currentEnergy = ctx.cognitiveProfile.currentEnergyLevel;
  const emotion = ctx.emotion;

  // If in burnout window or low energy, prioritize low-energy steps
  if (
    isInBurnoutWindow ||
    currentEnergy < 0.5 ||
    (emotion &&
      (emotion.detected_emotion === "stressed" ||
        emotion.detected_emotion === "tired" ||
        emotion.detected_emotion === "burned_out"))
  ) {
    for (const step of [...lowEnergy, ...mediumEnergy, ...highEnergy]) {
      if (remainingMinutes >= step.estimatedMinutes) {
        sequenced.push(step);
        remainingMinutes -= step.estimatedMinutes;
      }
    }
  } else {
    // Normal sequencing: high energy first, then medium, then low
    for (const step of [...highEnergy, ...mediumEnergy, ...lowEnergy]) {
      if (remainingMinutes >= step.estimatedMinutes) {
        sequenced.push(step);
        remainingMinutes -= step.estimatedMinutes;
      }
    }
  }

  return sequenced;
}

/**
 * Group steps into time blocks
 */
function groupIntoTimeBlocks(
  steps: MicroStep[],
  ctx: PulseCortexContext
): MicroPlan["timeBlocks"] {
  const blocks: MicroPlan["timeBlocks"] = [];
  let currentBlock: MicroStep[] = [];
  let currentBlockMinutes = 0;
  let blockStartTime = new Date();

  // Set start time to next hour
  blockStartTime.setMinutes(0);
  blockStartTime.setSeconds(0);
  if (blockStartTime < new Date()) {
    blockStartTime.setHours(blockStartTime.getHours() + 1);
  }

  for (const step of steps) {
    const shouldStartNewBlock =
      currentBlock.length === 0 ||
      (step.energyRequired === "high" && currentBlockMinutes > 0) ||
      currentBlockMinutes + step.estimatedMinutes > 60;

    if (shouldStartNewBlock && currentBlock.length > 0) {
      blocks.push({
        startTime: blockStartTime.toISOString(),
        duration: currentBlockMinutes,
        steps: [...currentBlock],
      });

      blockStartTime = new Date(
        blockStartTime.getTime() + currentBlockMinutes * 60 * 1000
      );
      blockStartTime = new Date(blockStartTime.getTime() + 15 * 60 * 1000); // 15 min buffer
      currentBlock = [];
      currentBlockMinutes = 0;
    }

    currentBlock.push(step);
    currentBlockMinutes += step.estimatedMinutes;
  }

  if (currentBlock.length > 0) {
    blocks.push({
      startTime: blockStartTime.toISOString(),
      duration: currentBlockMinutes,
      steps: currentBlock,
    });
  }

  return blocks;
}

/**
 * Estimate energy required with longitudinal context
 */
function estimateEnergyRequired(
  objective: PulseObjective,
  ctx: PulseCortexContext
): "low" | "medium" | "high" {
  const minutes = objective.estimatedMinutes || 15;

  // Check if user is in a burnout pattern
  const burnoutPatterns = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "burnout_cycle"
  );
  const isInBurnoutWindow = burnoutPatterns.some((p) => {
    if (!p.endDate) return false;
    const end = new Date(p.endDate).getTime();
    return Date.now() - end < 7 * 24 * 60 * 60 * 1000;
  });

  if (isInBurnoutWindow) {
    // Reduce energy estimates during burnout recovery
    if (minutes <= 30) return "low";
    if (minutes <= 60) return "medium";
    return "medium"; // Cap at medium during burnout
  }

  if (minutes <= 15) return "low";
  if (minutes <= 60) return objective.importance > 70 ? "high" : "medium";
  return "high";
}

/**
 * Generate step titles with domain-specific patterns
 */
function generateStepTitles(
  objective: PulseObjective,
  stepCount: number,
  ctx: PulseCortexContext
): string[] {
  const title = objective.title.toLowerCase();
  const steps: string[] = [];

  // Use longitudinal patterns to inform step generation
  const productivityPatterns = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "productivity_arc"
  );

  if (objective.domain === "work") {
    if (title.includes("write") || title.includes("draft") || title.includes("proposal")) {
      steps.push("Gather context and notes");
      steps.push("Create outline");
      steps.push("Draft introduction");
      if (stepCount > 3) {
        steps.push("Draft main sections");
        if (stepCount > 4) {
          steps.push("Review and refine");
          if (stepCount > 5) {
            steps.push("Final polish");
          }
        }
      }
    } else if (title.includes("meeting") || title.includes("prep")) {
      steps.push("Review agenda and attendees");
      steps.push("Gather relevant documents");
      steps.push("Prepare talking points");
      if (stepCount > 3) {
        steps.push("Set up meeting space/tech");
      }
    } else {
      steps.push("Prepare and gather context");
      steps.push("Execute main work");
      if (stepCount > 2) {
        steps.push("Review and refine");
        if (stepCount > 3) {
          steps.push("Complete and wrap up");
        }
      }
    }
  } else if (objective.domain === "relationships") {
    steps.push("Review relationship history");
    steps.push("Draft message or prepare talking points");
    steps.push("Send or schedule interaction");
    if (stepCount > 3) {
      steps.push("Follow up if needed");
    }
  } else if (objective.domain === "finance") {
    steps.push("Gather financial information");
    steps.push("Analyze current state");
    steps.push("Make decision or take action");
    if (stepCount > 3) {
      steps.push("Document and review");
    }
  } else {
    steps.push("Prepare and gather context");
    steps.push("Execute main work");
    if (stepCount > 2) {
      steps.push("Review and refine");
      if (stepCount > 3) {
        steps.push("Complete and wrap up");
      }
    }
  }

  while (steps.length < stepCount) {
    steps.push(`Step ${steps.length + 1}`);
  }

  return steps.slice(0, stepCount);
}

