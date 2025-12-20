// Executive Function Core (Domain Agnostic)
// lib/cortex/executive.ts

import { DomainKey, PulseCortexContext } from "./types";

// Re-export from ef.ts (v3 implementation)
export { generateMicroPlan, type MicroPlan } from "./executive/ef";

export interface PulseObjective {
  id: string;
  domain: DomainKey;
  title: string;
  description?: string;
  targetDate?: string;
  importance: number; // 0-100
  urgency: number; // 0-100
  estimatedMinutes?: number;
  metadata?: Record<string, any>;
}

export interface MicroStep {
  id: string;
  objectiveId: string;
  domain: DomainKey;
  title: string;
  estimatedMinutes: number;
  energyRequired: "low" | "medium" | "high";
  source: "user_defined" | "ef_generated" | "autopilot";
  order: number;
  metadata?: Record<string, any>;
}

/**
 * Break an objective into micro-steps using EF analysis
 * @deprecated Use lib/cortex/executive/ef.ts instead
 */
export function breakObjectiveIntoSteps(
  objective: PulseObjective,
  ctx: PulseCortexContext
): MicroStep[] {
  // Determine if breakdown is needed
  const needsBreakdown =
    (objective.estimatedMinutes && objective.estimatedMinutes > 20) ||
    objective.importance > 70 ||
    objective.urgency > 80;

  if (!needsBreakdown) {
    // Return single step
    return [
      {
        id: `${objective.id}_step_1`,
        objectiveId: objective.id,
        domain: objective.domain,
        title: objective.title,
        estimatedMinutes: objective.estimatedMinutes || 15,
        energyRequired: estimateEnergyRequired(objective),
        source: "ef_generated",
        order: 1,
        metadata: objective.metadata,
      },
    ];
  }

  // Generate 3-7 micro-steps based on domain and context
  const stepCount = Math.min(
    7,
    Math.max(3, Math.ceil((objective.estimatedMinutes || 30) / 10))
  );
  const steps: MicroStep[] = [];

  const stepTitles = generateStepTitles(objective, stepCount, ctx);

  for (let i = 0; i < stepCount; i++) {
    const minutesPerStep = Math.ceil((objective.estimatedMinutes || 30) / stepCount);

    steps.push({
      id: `${objective.id}_step_${i + 1}`,
      objectiveId: objective.id,
      domain: objective.domain,
      title: stepTitles[i] || `Step ${i + 1}`,
      estimatedMinutes: minutesPerStep,
      energyRequired:
        i === 0
          ? "medium" // First step often requires more context
          : i === stepCount - 1
          ? "low" // Last step is usually wrap-up
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
 * Sequence micro-steps based on context, emotion, and energy
 * @deprecated Use lib/cortex/executive/ef.ts instead
 */
export function sequenceMicroSteps(
  steps: MicroStep[],
  ctx: PulseCortexContext,
  timeBudgetMinutes: number
): MicroStep[] {
  // Filter steps that fit in time budget
  let remainingMinutes = timeBudgetMinutes;
  const sequenced: MicroStep[] = [];

  // Group by energy requirement
  const lowEnergy = steps.filter((s) => s.energyRequired === "low");
  const mediumEnergy = steps.filter((s) => s.energyRequired === "medium");
  const highEnergy = steps.filter((s) => s.energyRequired === "high");

  // Adjust based on current energy level
  const currentEnergy = ctx.cognitiveProfile.currentEnergyLevel;
  const emotion = ctx.emotion;

  // If low energy or stressed, prioritize low-energy steps
  if (
    currentEnergy < 0.5 ||
    (emotion && (emotion.detected_emotion === "stressed" || emotion.detected_emotion === "tired"))
  ) {
    // Start with low-energy steps
    for (const step of [...lowEnergy, ...mediumEnergy, ...highEnergy]) {
      if (remainingMinutes >= step.estimatedMinutes) {
        sequenced.push(step);
        remainingMinutes -= step.estimatedMinutes;
      }
    }
  } else {
    // Normal sequencing: high energy first (if available), then medium, then low
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
 * Estimate energy required for an objective
 */
function estimateEnergyRequired(objective: PulseObjective): "low" | "medium" | "high" {
  const minutes = objective.estimatedMinutes || 15;

  if (minutes <= 15) return "low";
  if (minutes <= 60) return objective.importance > 70 ? "high" : "medium";
  return "high";
}

/**
 * Generate step titles based on objective domain and type
 */
function generateStepTitles(
  objective: PulseObjective,
  stepCount: number,
  ctx: PulseCortexContext
): string[] {
  const title = objective.title.toLowerCase();
  const steps: string[] = [];

  // Domain-specific patterns
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
    // Generic breakdown
    steps.push("Prepare and gather context");
    steps.push("Execute main work");
    if (stepCount > 2) {
      steps.push("Review and refine");
      if (stepCount > 3) {
        steps.push("Complete and wrap up");
      }
    }
  }

  // Fill remaining slots
  while (steps.length < stepCount) {
    steps.push(`Step ${steps.length + 1}`);
  }

  return steps.slice(0, stepCount);
}

