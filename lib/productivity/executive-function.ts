// Executive Function Engine
// lib/productivity/executive-function.ts

import { WorkItem } from "./types";
import { ThirdBrainContext } from "./context-builder";

export interface MicroStep {
  id: string;
  parentTaskId: string;
  title: string;
  estimatedMinutes: number;
  cognitiveLoad: "low" | "medium" | "high";
  requiredContext?: string[];
  order: number;
}

export interface TaskAnalysis {
  cognitiveLoad: "low" | "medium" | "high";
  requiredContext: string[];
  needsBreakdown: boolean;
  optimalTimeOfDay?: "morning" | "afternoon" | "evening";
  energyRequirement: "low" | "medium" | "high";
  estimatedMicroSteps?: number;
}

export interface CognitiveProfile {
  peakHours: number[]; // Hours of day when user performs best (0-23)
  preferredTaskLength: number; // Minutes
  contextSwitchingCost: number; // 0-1, how much switching hurts performance
  deepWorkCapacity: number; // Minutes per day
  currentEnergyLevel: number; // 0-1
}

/**
 * Analyze a task to determine cognitive requirements and fit
 */
export function analyzeTask(
  task: WorkItem,
  thirdBrainContext: ThirdBrainContext
): TaskAnalysis {
  // Estimate cognitive load based on task characteristics
  let cognitiveLoad: "low" | "medium" | "high" = "low";
  
  if (task.estimatedMinutes && task.estimatedMinutes > 60) {
    cognitiveLoad = "high";
  } else if (task.estimatedMinutes && task.estimatedMinutes > 20) {
    cognitiveLoad = "medium";
  }

  // Check if task relates to active projects (increases cognitive load)
  const relatesToActiveProject = thirdBrainContext.activeProjects.some(
    (project) =>
      task.title.toLowerCase().includes(project.name.toLowerCase()) ||
      task.projectId === project.id
  );

  if (relatesToActiveProject) {
    cognitiveLoad = cognitiveLoad === "low" ? "medium" : "high";
  }

  // Determine required context
  const requiredContext: string[] = [];
  
  if (task.projectId) {
    const project = thirdBrainContext.activeProjects.find((p) => p.id === task.projectId);
    if (project) {
      requiredContext.push(`project:${project.name}`);
      if (project.recentNotes.length > 0) {
        requiredContext.push("recent_project_notes");
      }
    }
  }

  // Check if task needs breakdown
  const needsBreakdown =
    (task.estimatedMinutes && task.estimatedMinutes > 20) ||
    cognitiveLoad === "high" ||
    (task.energyRequired === "high" && task.estimatedMinutes && task.estimatedMinutes > 15);

  // Determine optimal time of day based on cognitive load
  let optimalTimeOfDay: "morning" | "afternoon" | "evening" | undefined;
  if (cognitiveLoad === "high") {
    optimalTimeOfDay = "morning"; // Deep work in morning
  } else if (cognitiveLoad === "medium") {
    optimalTimeOfDay = "afternoon";
  } else {
    optimalTimeOfDay = "evening"; // Light tasks in evening
  }

  return {
    cognitiveLoad,
    requiredContext,
    needsBreakdown,
    optimalTimeOfDay,
    energyRequirement: task.energyRequired,
    estimatedMicroSteps: needsBreakdown ? Math.min(7, Math.max(3, Math.ceil((task.estimatedMinutes || 30) / 10))) : undefined,
  };
}

/**
 * Break a task into micro-steps
 */
export function breakIntoSteps(task: WorkItem, analysis: TaskAnalysis): MicroStep[] {
  if (!analysis.needsBreakdown || !analysis.estimatedMicroSteps) {
    return [];
  }

  const steps: MicroStep[] = [];
  const stepCount = analysis.estimatedMicroSteps;
  const minutesPerStep = Math.ceil((task.estimatedMinutes || 30) / stepCount);

  // Generate step titles based on task type and title
  const stepTitles = generateStepTitles(task, stepCount);

  for (let i = 0; i < stepCount; i++) {
    steps.push({
      id: `${task.id}_step_${i + 1}`,
      parentTaskId: task.id,
      title: stepTitles[i] || `Step ${i + 1}`,
      estimatedMinutes: minutesPerStep,
      cognitiveLoad: i === 0 ? "medium" : "low", // First step often requires more context
      requiredContext: i === 0 ? analysis.requiredContext : undefined,
      order: i + 1,
    });
  }

  return steps;
}

/**
 * Generate step titles based on task characteristics
 */
function generateStepTitles(task: WorkItem, stepCount: number): string[] {
  const title = task.title.toLowerCase();
  const steps: string[] = [];

  // Pattern matching for common task types
  if (title.includes("write") || title.includes("draft") || title.includes("proposal")) {
    steps.push("Gather past notes and context");
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
  } else if (title.includes("email") || title.includes("follow")) {
    steps.push("Review previous conversation");
    steps.push("Draft response");
    steps.push("Review and send");
  } else if (title.includes("research") || title.includes("analyze")) {
    steps.push("Define research questions");
    steps.push("Gather sources");
    steps.push("Analyze findings");
    if (stepCount > 3) {
      steps.push("Synthesize insights");
      if (stepCount > 4) {
        steps.push("Document conclusions");
      }
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

  // Fill remaining slots with generic steps
  while (steps.length < stepCount) {
    steps.push(`Step ${steps.length + 1}`);
  }

  return steps.slice(0, stepCount);
}

/**
 * Sequence tasks based on cognitive load, energy, and time of day
 */
export function sequenceTasks(
  tasks: WorkItem[],
  userEnergyProfile: CognitiveProfile,
  emotion: { type: string; intensity: number } | null
): WorkItem[] {
  const now = new Date();
  const currentHour = now.getHours();
  const isMorning = currentHour >= 6 && currentHour < 12;
  const isAfternoon = currentHour >= 12 && currentHour < 18;
  const isEvening = currentHour >= 18 || currentHour < 6;

  // Adjust energy level based on emotion
  let effectiveEnergy = userEnergyProfile.currentEnergyLevel;
  if (emotion) {
    if (emotion.type === "tired" || emotion.type === "stressed") {
      effectiveEnergy *= 0.6;
    } else if (emotion.type === "excited" || emotion.type === "motivated") {
      effectiveEnergy = Math.min(1.0, effectiveEnergy * 1.2);
    }
  }

  // Sort tasks by:
  // 1. Time-of-day fit (morning = high cognitive load, evening = low)
  // 2. Energy requirement vs available energy
  // 3. Cognitive load (group similar loads together to reduce switching)
  // 4. Original priority (importance + urgency)

  const scored = tasks.map((task) => {
    let timeFit = 0;
    if (isMorning && task.energyRequired === "high") timeFit = 1.0;
    else if (isAfternoon && task.energyRequired === "medium") timeFit = 0.8;
    else if (isEvening && task.energyRequired === "low") timeFit = 0.9;
    else timeFit = 0.5;

    const energyFit =
      task.energyRequired === "high"
        ? effectiveEnergy > 0.7
          ? 1.0
          : 0.3
        : task.energyRequired === "medium"
        ? effectiveEnergy > 0.5
          ? 1.0
          : 0.6
        : 1.0; // Low energy tasks always fit

    const priorityScore = task.importanceScore * 0.6 + task.urgencyScore * 0.4;

    return {
      task,
      finalScore: timeFit * 0.3 + energyFit * 0.3 + priorityScore * 0.4,
      timeFit,
      energyFit,
    };
  });

  // Sort by final score, then group by cognitive load to reduce switching
  scored.sort((a, b) => {
    if (Math.abs(a.finalScore - b.finalScore) < 0.1) {
      // If scores are close, prefer grouping by energy requirement
      const aEnergy = a.task.energyRequired === "high" ? 3 : a.task.energyRequired === "medium" ? 2 : 1;
      const bEnergy = b.task.energyRequired === "high" ? 3 : b.task.energyRequired === "medium" ? 2 : 1;
      return bEnergy - aEnergy;
    }
    return b.finalScore - a.finalScore;
  });

  return scored.map((s) => s.task);
}

/**
 * Estimate cognitive load for a task
 */
export function estimateCognitiveLoad(task: WorkItem): "low" | "medium" | "high" {
  if (task.estimatedMinutes && task.estimatedMinutes > 60) return "high";
  if (task.estimatedMinutes && task.estimatedMinutes > 20) return "medium";
  if (task.energyRequired === "high") return "high";
  if (task.energyRequired === "medium") return "medium";
  return "low";
}



