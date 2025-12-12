// Life Domain Autonomy Policies v3
// lib/cortex/autonomy/policies/life-policies.ts

import { registerPolicy, AutonomyPolicy, AutonomyAction } from "../v3";
import { PulseCortexContext } from "../../types";
import { PulseCortexContext } from "../../types";

/**
 * Policy: Habit Burst Detection
 */
const habitBurstPolicy: AutonomyPolicy = {
  id: "life:habit_burst",
  domain: "life",
  name: "Habit Burst Detection",
  description: "Detect and capitalize on habit completion bursts",
  priority: 8,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    const habitBursts = ctx.longitudinal.aggregatedPatterns.filter(
      (p) => p.type === "habit_burst"
    );

    if (habitBursts.length > 0) {
      const recentBurst = habitBursts[0];
      const isRecent = new Date(recentBurst.startDate).getTime() >
        Date.now() - 7 * 24 * 60 * 60 * 1000;

      if (isRecent && recentBurst.strength > 0.7) {
        actions.push({
          id: "habit_burst_opportunity",
          domain: "life",
          title: "🎯 Habit Momentum Detected",
          description: "You're in a habit completion burst. Consider adding new habits or increasing existing ones.",
          severity: "info",
          payload: {
            type: "habit_burst_opportunity",
            suggestedAction: "leverage_momentum",
            burstStrength: recentBurst.strength,
          },
          metadata: {
            patternId: recentBurst.id,
            patternDescription: recentBurst.description,
          },
        });
      }
    }

    return actions;
  },
};

/**
 * Policy: Habit Streak Recovery
 */
const habitStreakRecoveryPolicy: AutonomyPolicy = {
  id: "life:habit_streak_recovery",
  domain: "life",
  name: "Habit Streak Recovery",
  description: "Help recover broken habit streaks",
  priority: 10,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    if (!ctx.domains.life?.habits) return actions;

    const brokenStreaks = ctx.domains.life.habits.filter(
      (h) => h.completionRate < 0.5 && h.streak === 0
    );

    for (const habit of brokenStreaks.slice(0, 3)) {
      actions.push({
        id: `habit_recovery_${habit.id}`,
        domain: "life",
        title: `Restart habit: ${habit.name}`,
        description: `Completion rate: ${Math.round(habit.completionRate * 100)}%`,
        severity: "info",
        payload: {
          type: "habit_recovery",
          habitId: habit.id,
          habitName: habit.name,
          suggestedAction: "restart_with_small_commitment",
        },
        metadata: {
          completionRate: habit.completionRate,
        },
      });
    }

    return actions;
  },
};

// Register all policies
registerPolicy(habitBurstPolicy);
registerPolicy(habitStreakRecoveryPolicy);

