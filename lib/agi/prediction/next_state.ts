// Next-State Prediction - Anticipatory Behavior
// lib/agi/prediction/next_state.ts

import { WorldState } from "../types";

export interface NextStatePrediction {
  likelyAfternoonStress?: "low" | "medium" | "high";
  likelyTaskSpilloverToday?: boolean;
  likelyInboxOverloadToday?: boolean;
  focusWindowsToday?: { start: string; end: string; quality: "excellent" | "good" | "fair" }[];
  riskOfProcrastinationOnKeyTasks?: boolean;
  predictedEmotionState?: string;
  predictedProductivity?: "low" | "medium" | "high";
}

/**
 * Predict next state based on current WorldState
 */
export function predictNextState(world: WorldState): NextStatePrediction {
  const prediction: NextStatePrediction = {};

  // 1. Predict afternoon stress
  const calendarLoad = world.time.upcomingEvents?.length || 0;
  const overdueTasks = world.time.overdueTasks?.length || 0;
  const todayTasks = world.time.todayTasks?.length || 0;
  const dayFeatures = world.time.dayFeatures;
  const currentEmotion = world.emotion?.currentState?.toLowerCase() || "";
  const emotionTrend = world.emotion?.recentTrend || "stable";

  // Stress factors
  const stressFactors = {
    overloaded: dayFeatures?.overloadScore && dayFeatures.overloadScore > 0.7 ? 1 : 0,
    fragmented: dayFeatures?.fragmentationScore && dayFeatures.fragmentationScore > 0.6 ? 1 : 0,
    overdue: overdueTasks > 5 ? 1 : overdueTasks > 2 ? 0.5 : 0,
    highTaskLoad: todayTasks > 8 ? 1 : todayTasks > 5 ? 0.5 : 0,
    currentStress: currentEmotion.includes("stressed") || currentEmotion.includes("overwhelmed") ? 1 : 0,
    risingStress: emotionTrend === "rising" ? 1 : 0,
    emailPressure: (world.email?.waitingOnUser?.length || 0) > 5 ? 0.5 : 0,
    financeStress: (world.finances?.stressSignals?.length || 0) > 0 ? 0.5 : 0,
  };

  const stressScore =
    stressFactors.overloaded +
    stressFactors.fragmented +
    stressFactors.overdue +
    stressFactors.highTaskLoad +
    stressFactors.currentStress +
    stressFactors.risingStress +
    stressFactors.emailPressure +
    stressFactors.financeStress;

  if (stressScore >= 3) {
    prediction.likelyAfternoonStress = "high";
  } else if (stressScore >= 1.5) {
    prediction.likelyAfternoonStress = "medium";
  } else {
    prediction.likelyAfternoonStress = "low";
  }

  // 2. Predict task spillover
  const totalTasks = todayTasks + overdueTasks;
  const availableTimeBlocks = dayFeatures?.opportunityBlocks?.length || 0;
  const avgTaskDuration = 30; // minutes (heuristic)
  const estimatedTaskTime = totalTasks * avgTaskDuration;
  const availableTime = availableTimeBlocks * 60; // Convert blocks to minutes (rough estimate)

  prediction.likelyTaskSpilloverToday = estimatedTaskTime > availableTime * 0.8;

  // 3. Predict inbox overload
  const urgentEmails = world.email?.urgentThreads?.length || 0;
  const waitingOnUser = world.email?.waitingOnUser?.length || 0;
  const riskThreads = world.email?.riskThreads?.length || 0;

  prediction.likelyInboxOverloadToday = urgentEmails > 3 || waitingOnUser > 8 || riskThreads > 2;

  // 4. Predict focus windows
  const routineProfile = world.meta.routineProfile;
  const opportunityBlocks = dayFeatures?.opportunityBlocks || [];

  prediction.focusWindowsToday = [];

  if (routineProfile?.bestFocusWindow) {
    const focusWindow = routineProfile.bestFocusWindow;
    const startHour = focusWindow.startHour || 9;
    const endHour = focusWindow.endHour || 12;
    const confidence = focusWindow.confidence || 0.5;

    // Find matching opportunity blocks
    const matchingBlocks = opportunityBlocks.filter((block: any) => {
      const blockStart = new Date(block.start);
      const blockHour = blockStart.getHours();
      return blockHour >= startHour - 1 && blockHour <= endHour + 1;
    });

    if (matchingBlocks.length > 0) {
      for (const block of matchingBlocks.slice(0, 2)) {
        prediction.focusWindowsToday?.push({
          start: block.start,
          end: block.end,
          quality: confidence > 0.7 ? "excellent" : confidence > 0.5 ? "good" : "fair",
        });
      }
    } else {
      // Fallback: create synthetic window based on routine
      const now = new Date();
      const start = new Date(now);
      start.setHours(startHour, 0, 0, 0);
      const end = new Date(now);
      end.setHours(endHour, 0, 0, 0);

      if (end > now) {
        prediction.focusWindowsToday?.push({
          start: start.toISOString(),
          end: end.toISOString(),
          quality: confidence > 0.7 ? "excellent" : confidence > 0.5 ? "good" : "fair",
        });
      }
    }
  } else if (opportunityBlocks.length > 0) {
    // Use opportunity blocks if no routine profile
    for (const block of opportunityBlocks.slice(0, 2)) {
      prediction.focusWindowsToday?.push({
        start: block.start,
        end: block.end,
        quality: "good",
      });
    }
  }

  // 5. Predict procrastination risk
  const avoidanceWindow = routineProfile?.avoidanceWindow;
  const now = new Date();
  const currentHour = now.getHours();

  if (avoidanceWindow) {
    const avoidanceStart = avoidanceWindow.startHour || 14;
    const avoidanceEnd = avoidanceWindow.endHour || 16;
    const isInAvoidanceWindow = currentHour >= avoidanceStart && currentHour <= avoidanceEnd;

    prediction.riskOfProcrastinationOnKeyTasks =
      isInAvoidanceWindow && overdueTasks > 0 && todayTasks > 3;
  } else {
    // Heuristic: afternoon + many tasks + overdue = procrastination risk
    prediction.riskOfProcrastinationOnKeyTasks =
      currentHour >= 14 && currentHour <= 17 && overdueTasks > 2 && todayTasks > 5;
  }

  // 6. Predict emotion state
  if (emotionTrend === "rising" && currentEmotion.includes("stressed")) {
    prediction.predictedEmotionState = "high_stress";
  } else if (emotionTrend === "falling" && currentEmotion.includes("energized")) {
    prediction.predictedEmotionState = "calm";
  } else {
    prediction.predictedEmotionState = currentEmotion || "neutral";
  }

  // 7. Predict productivity
  const productivityFactors = {
    goodFocusWindow: prediction.focusWindowsToday && prediction.focusWindowsToday.length > 0 ? 1 : 0,
    lowStress: prediction.likelyAfternoonStress === "low" ? 1 : 0,
    manageableLoad: !prediction.likelyTaskSpilloverToday ? 1 : 0,
    energized: currentEmotion.includes("energized") || currentEmotion.includes("hyped") ? 1 : 0,
    routineMatch: routineProfile?.highPerformanceDays?.includes(now.getDay()) ? 1 : 0,
  };

  const productivityScore =
    productivityFactors.goodFocusWindow +
    productivityFactors.lowStress +
    productivityFactors.manageableLoad +
    productivityFactors.energized +
    productivityFactors.routineMatch;

  if (productivityScore >= 4) {
    prediction.predictedProductivity = "high";
  } else if (productivityScore >= 2) {
    prediction.predictedProductivity = "medium";
  } else {
    prediction.predictedProductivity = "low";
  }

  return prediction;
}



