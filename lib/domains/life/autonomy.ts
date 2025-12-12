// Life Domain Autonomy Policies
// lib/domains/life/autonomy.ts

import { registerAutonomyPolicy, AutonomyPolicy, AutonomyAction } from "@/lib/cortex/autonomy";
import { PulseCortexContext } from "@/lib/cortex/types";

/**
 * Policy: Habit Streak Recovery
 * Suggests recovering broken habit streaks
 */
const habitStreakRecoveryPolicy: AutonomyPolicy = {
  id: "life:habit_streak_recovery",
  domain: "life",
  name: "Habit Streak Recovery",
  description: "Help recover broken habit streaks",
  isEnabled: true,
  priority: 8,
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
        riskLevel: "low",
        requiresConfirmation: false,
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

/**
 * Policy: Health Signal Decline
 * Alerts on declining health signals
 */
const healthSignalDeclinePolicy: AutonomyPolicy = {
  id: "life:health_signal_decline",
  domain: "life",
  name: "Health Signal Decline",
  description: "Alert when health signals are declining",
  isEnabled: true,
  priority: 10,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    if (!ctx.domains.life?.healthSignals) return actions;

    const declining = ctx.domains.life.healthSignals.filter(
      (s) => s.trend === "declining"
    );

    for (const signal of declining) {
      actions.push({
        id: `health_alert_${signal.type}`,
        domain: "life",
        title: `Health alert: ${signal.type}`,
        description: `${signal.type} is declining`,
        riskLevel: "medium",
        requiresConfirmation: false,
        payload: {
          type: "health_alert",
          signalType: signal.type,
          suggestedAction: "review_health_patterns",
        },
        metadata: {
          value: signal.value,
          trend: signal.trend,
        },
      });
    }

    return actions;
  },
};

// Register all policies
registerAutonomyPolicy(habitStreakRecoveryPolicy);
registerAutonomyPolicy(healthSignalDeclinePolicy);



