// Quantum Task Liquidity Engine - Dynamic Task Flow
// lib/quantum-tasks/liquidity.ts

import { QuantumTask } from "./types";
import { PulseCortexContext } from "@/lib/cortex/types";
import { generateTimeSlices } from "@/lib/time-slicing/v1/tse";
import { scanIdentity } from "@/lib/identity/v3";

/**
 * Flow tasks dynamically based on current state
 */
export async function flowTasks(
  userId: string,
  tasks: QuantumTask[],
  ctx: PulseCortexContext
): Promise<QuantumTask[]> {
  const flowedTasks: QuantumTask[] = [];

  // Get current identity mode
  const identityProfile = await scanIdentity(userId, ctx);
  const currentIdentityMode = identityProfile.currentArchetype;

  // Get time slices
  const timeSlices = generateTimeSlices(ctx);

  // Get current day
  const today = new Date().toISOString().split("T")[0];

  // Sort tasks by priority and energy match
  const sortedTasks = tasks
    .filter((t) => t.status === "pending" || t.status === "in_progress")
    .sort((a, b) => {
      // Priority first
      if (Math.abs(a.priority - b.priority) > 0.1) {
        return b.priority - a.priority;
      }

      // Then energy match
      const currentEnergy = ctx.cognitiveProfile.currentEnergyLevel;
      const aEnergyMatch = 1 - Math.abs(a.energyRequirement - currentEnergy);
      const bEnergyMatch = 1 - Math.abs(b.energyRequirement - currentEnergy);
      return bEnergyMatch - aEnergyMatch;
    });

  // Assign tasks to time slices and days
  for (const task of sortedTasks) {
    const flowedTask = { ...task };

    // Assign to today if high priority
    if (task.priority > 0.7) {
      flowedTask.currentDay = today;
    } else {
      // Distribute across next 3 days
      const daysAhead = Math.floor((1 - task.priority) * 3);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      flowedTask.currentDay = futureDate.toISOString().split("T")[0];
    }

    // Assign identity mode
    if (task.identityModeNeeded) {
      flowedTask.currentIdentityMode = task.identityModeNeeded;
    } else {
      flowedTask.currentIdentityMode = currentIdentityMode;
    }

    // Assign energy slot
    const energySlot = determineEnergySlot(task, ctx);
    flowedTask.currentEnergySlot = energySlot;

    // Assign time slice
    const matchingSlice = findMatchingTimeSlice(task, timeSlices, energySlot);
    if (matchingSlice) {
      flowedTask.currentTimeSliceId = matchingSlice.id;
    }

    flowedTasks.push(flowedTask);
  }

  return flowedTasks;
}

/**
 * Determine best energy slot for task
 */
function determineEnergySlot(
  task: QuantumTask,
  ctx: PulseCortexContext
): "morning" | "afternoon" | "evening" {
  const energy = task.energyRequirement;
  const cognitive = task.cognitiveDifficulty;

  // High energy + high cognitive = morning
  if (energy > 0.7 && cognitive > 0.7) {
    return "morning";
  }

  // Medium = afternoon
  if (energy > 0.4 && cognitive > 0.4) {
    return "afternoon";
  }

  // Low = evening
  return "evening";
}

/**
 * Find matching time slice
 */
function findMatchingTimeSlice(
  task: QuantumTask,
  timeSlices: any[],
  energySlot: "morning" | "afternoon" | "evening"
): any | null {
  // Find slices matching domain and energy slot
  const matching = timeSlices.filter((slice) => {
    const sliceHour = new Date(slice.start).getHours();
    const slotMatch =
      (energySlot === "morning" && sliceHour >= 6 && sliceHour < 12) ||
      (energySlot === "afternoon" && sliceHour >= 12 && sliceHour < 18) ||
      (energySlot === "evening" && sliceHour >= 18 && sliceHour < 22);

    return slice.domain === task.domain && slotMatch;
  });

  if (matching.length > 0) {
    // Return slice with closest energy match
    return matching.sort(
      (a, b) =>
        Math.abs(a.energyRequired === "high" ? 0.8 : a.energyRequired === "medium" ? 0.5 : 0.3 - task.energyRequirement) -
        Math.abs(b.energyRequired === "high" ? 0.8 : b.energyRequired === "medium" ? 0.5 : 0.3 - task.energyRequirement)
    )[0];
  }

  return null;
}

/**
 * Reflow tasks when state changes
 */
export async function reflowTasks(
  userId: string,
  tasks: QuantumTask[],
  ctx: PulseCortexContext,
  trigger: "energy_change" | "emotion_change" | "identity_shift" | "time_advance"
): Promise<QuantumTask[]> {
  // Reflow based on trigger
  switch (trigger) {
    case "energy_change":
      // Reflow based on new energy level
      return flowTasks(userId, tasks, ctx);

    case "emotion_change":
      // Adjust emotional resistance scores
      const emotion = ctx.emotion?.detected_emotion;
      if (emotion === "stressed" || emotion === "overwhelmed") {
        // Increase resistance for high-energy tasks
        return tasks.map((t) => ({
          ...t,
          emotionalResistance: t.energyRequirement > 0.7 ? Math.min(1, t.emotionalResistance + 0.2) : t.emotionalResistance,
        }));
      }
      return tasks;

    case "identity_shift":
      // Reflow based on new identity mode
      return flowTasks(userId, tasks, ctx);

    case "time_advance":
      // Move overdue tasks forward
      const today = new Date().toISOString().split("T")[0];
      return tasks.map((t) => {
        if (t.currentDay && t.currentDay < today && t.status === "pending") {
          return { ...t, currentDay: today, priority: Math.min(1, t.priority + 0.1) };
        }
        return t;
      });

    default:
      return tasks;
  }
}



