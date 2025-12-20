// Productivity Orchestrator - Autonomous Planning Engine
// lib/productivity/orchestrator.ts

import { buildTodayQueue } from "./queue";
import { buildThirdBrainProductivityContext } from "./context-builder";
import { sequenceTasks, CognitiveProfile } from "./executive-function";
import { getCurrentEmotionState } from "@/lib/emotion-os/server";
import { WorkItem } from "./types";

export interface FocusBlockPlan {
  id: string;
  startTime: string;
  duration: number; // minutes
  mode: "single_task" | "power_hour";
  workItemIds: string[];
  estimatedCompletion: string;
}

export interface DayPlan {
  userId: string;
  date: string; // YYYY-MM-DD
  bigThree: Array<{ id: string; title: string }>;
  focusBlocks: FocusBlockPlan[];
  totalEstimatedMinutes: number;
  createdAt: string;
}

/**
 * Replan the entire day using EF + Third Brain
 */
export async function replanDay(userId: string): Promise<DayPlan> {
  // 1. Build Third Brain context
  const thirdBrainContext = await buildThirdBrainProductivityContext(userId);

  // 2. Build today's queue with full EF analysis
  const queue = await buildTodayQueue(userId, {
    includeThirdBrain: true,
    includeEFAnalysis: true,
    autonomousMode: true,
  });

  // 3. Get emotion state for sequencing
  const emotionState = await getCurrentEmotionState(userId);
  const cognitiveProfile = thirdBrainContext.cognitiveProfile;

  // 4. Sequence tasks optimally
  const sequenced = sequenceTasks(
    queue,
    cognitiveProfile,
    emotionState
      ? { type: emotionState.detected_emotion, intensity: emotionState.intensity }
      : null
  );

  // 5. Generate focus block plan
  const focusBlocks = generateFocusBlockPlan(sequenced, cognitiveProfile);

  // 6. Extract Big 3 from weekly plan or top 3 from queue
  const bigThree = extractBigThree(sequenced, thirdBrainContext);

  const date = new Date().toISOString().split("T")[0];

  return {
    userId,
    date,
    bigThree,
    focusBlocks,
    totalEstimatedMinutes: focusBlocks.reduce((sum, block) => sum + block.duration, 0),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Adaptive replanning when triggers occur
 */
export async function adaptiveReplan(
  userId: string,
  trigger: "low_energy" | "task_avoidance" | "completion_burst" | "calendar_change"
): Promise<{
  next30Minutes: WorkItem[];
  next60Minutes: WorkItem[];
  suggestedMode: "single_task" | "power_hour" | "recovery";
}> {
  // Rebuild queue with current context
  const queue = await buildTodayQueue(userId, {
    includeThirdBrain: true,
    includeEFAnalysis: true,
    autonomousMode: true,
  });

  // Get current state
  const emotionState = await getCurrentEmotionState(userId);
  const thirdBrainContext = await buildThirdBrainProductivityContext(userId);
  const cognitiveProfile = thirdBrainContext.cognitiveProfile;

  // Adjust based on trigger
  let adjustedQueue = queue;
  let suggestedMode: "single_task" | "power_hour" | "recovery" = "single_task";

  if (trigger === "low_energy" || trigger === "task_avoidance") {
    // Filter to low-energy tasks only
    adjustedQueue = queue.filter((item) => item.energyRequired === "low");
    suggestedMode = "recovery";
  } else if (trigger === "completion_burst") {
    // User is in flow - suggest power hour
    suggestedMode = "power_hour";
  }

  // Sequence the adjusted queue
  const sequenced = sequenceTasks(
    adjustedQueue,
    cognitiveProfile,
    emotionState
      ? { type: emotionState.detected_emotion, intensity: emotionState.intensity }
      : null
  );

  // Extract next 30 and 60 minutes
  let minutes30 = 0;
  let minutes60 = 0;
  const next30Minutes: WorkItem[] = [];
  const next60Minutes: WorkItem[] = [];

  for (const item of sequenced) {
    const minutes = item.estimatedMinutes || 15;

    if (minutes30 + minutes <= 30) {
      next30Minutes.push(item);
      minutes30 += minutes;
    }

    if (minutes60 + minutes <= 60) {
      next60Minutes.push(item);
      minutes60 += minutes;
    }

    if (minutes30 >= 30 && minutes60 >= 60) break;
  }

  return {
    next30Minutes,
    next60Minutes,
    suggestedMode,
  };
}

/**
 * Generate focus block plan from sequenced tasks
 */
function generateFocusBlockPlan(
  tasks: WorkItem[],
  cognitiveProfile: CognitiveProfile
): FocusBlockPlan[] {
  const blocks: FocusBlockPlan[] = [];
  let currentBlock: WorkItem[] = [];
  let currentBlockMinutes = 0;
  let blockStartTime = new Date();

  // Set start time to next hour or current time
  const now = new Date();
  blockStartTime = new Date(now);
  blockStartTime.setMinutes(0);
  blockStartTime.setSeconds(0);
  if (blockStartTime < now) {
    blockStartTime.setHours(blockStartTime.getHours() + 1);
  }

  for (const task of tasks) {
    const taskMinutes = task.estimatedMinutes || 15;

    // Determine if task should start a new block
    const shouldStartNewBlock =
      currentBlock.length === 0 ||
      (task.energyRequired === "high" && currentBlockMinutes > 0) ||
      (currentBlockMinutes + taskMinutes > 60);

    if (shouldStartNewBlock && currentBlock.length > 0) {
      // Finalize current block
      blocks.push({
        id: `block_${blocks.length + 1}`,
        startTime: blockStartTime.toISOString(),
        duration: currentBlockMinutes,
        mode: currentBlock.length === 1 ? "single_task" : "power_hour",
        workItemIds: currentBlock.map((t) => t.id),
        estimatedCompletion: new Date(
          blockStartTime.getTime() + currentBlockMinutes * 60 * 1000
        ).toISOString(),
      });

      // Start new block
      blockStartTime = new Date(blockStartTime.getTime() + currentBlockMinutes * 60 * 1000);
      // Add 15 min buffer between blocks
      blockStartTime = new Date(blockStartTime.getTime() + 15 * 60 * 1000);
      currentBlock = [];
      currentBlockMinutes = 0;
    }

    // Add task to current block
    currentBlock.push(task);
    currentBlockMinutes += taskMinutes;
  }

  // Add final block
  if (currentBlock.length > 0) {
    blocks.push({
      id: `block_${blocks.length + 1}`,
      startTime: blockStartTime.toISOString(),
      duration: currentBlockMinutes,
      mode: currentBlock.length === 1 ? "single_task" : "power_hour",
      workItemIds: currentBlock.map((t) => t.id),
      estimatedCompletion: new Date(
        blockStartTime.getTime() + currentBlockMinutes * 60 * 1000
      ).toISOString(),
    });
  }

  return blocks;
}

/**
 * Extract Big 3 outcomes from queue or weekly plan
 */
function extractBigThree(
  queue: WorkItem[],
  thirdBrainContext: any
): Array<{ id: string; title: string }> {
  // Try to get from weekly plan first
  // TODO: Integrate with weekly planning engine

  // Fallback to top 3 from queue
  return queue.slice(0, 3).map((item, index) => ({
    id: `big3_${index + 1}`,
    title: item.title,
  }));
}



