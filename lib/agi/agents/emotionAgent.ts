// Emotion Agent - Detects stress/anxiety and proposes supportive actions
// lib/agi/agents/emotionAgent.ts

import { Agent, makeAgentResult } from "../agents";
import { AgentContext, AGIAction } from "../types";

export const emotionAgent: Agent = {
  name: "EmotionAgent",
  description: "Uses Emotion OS to detect stress/anxiety and propose supportive actions.",
  priority: 85, // High priority - emotional state affects everything

  async run(ctx: AgentContext) {
    const actions: AGIAction[] = [];
    const { world } = ctx;

    const emotionState = world.emotion?.currentState?.toLowerCase() || "";
    const emotionTrend = world.emotion?.recentTrend || "stable";
    const emotionIntensity = world.emotion?.intensity || 0.5;
    const isStressed = emotionState.includes("stressed") || emotionState.includes("overwhelmed");
    const isLow = emotionState.includes("low") || emotionState.includes("tired");
    const isRisingStress = emotionTrend === "rising" && isStressed;
    const predictions = world.predictions;

    // Stress detection with trend awareness
    if (isStressed) {
      const overdueCount = world.time.overdueTasks?.length ?? 0;
      const blockedCount = world.work.blockedItems?.length ?? 0;

      // Rising stress needs immediate attention
      if (isRisingStress && emotionIntensity > 0.7) {
        actions.push({
          type: "log_insight",
          label: "Stress is rising - prioritize recovery",
          details: {
            insight: `Your stress level is rising (intensity: ${Math.round(emotionIntensity * 100)}%). Consider taking a break, simplifying your plan, or reducing commitments today.`,
            priority: "high",
          },
          requiresConfirmation: false,
          riskLevel: "low",
        });

        // Suggest recovery micro-actions
        actions.push({
          type: "create_task",
          label: "Schedule recovery block",
          details: {
            title: "Recovery & reset",
            when: "today",
            metadata: { reason: "rising_stress_recovery", duration: 30 },
          },
          requiresConfirmation: true,
          riskLevel: "low",
        });
      } else if (overdueCount > 3 || blockedCount > 0) {
        actions.push({
          type: "nudge_user",
          label: "Consider a break or task triage session",
          details: {
            message: `You're feeling ${emotionState}. With ${overdueCount} overdue task(s) and ${blockedCount} blocked item(s), consider taking a moment to triage or take a break.`,
          },
          requiresConfirmation: false,
          riskLevel: "low",
        });
      } else {
        actions.push({
          type: "nudge_user",
          label: "Take a moment to breathe",
          details: {
            message: `You're feeling ${emotionState}. Consider a short break or breathing exercise.`,
          },
          requiresConfirmation: false,
          riskLevel: "low",
        });
      }
    }

    // Low energy detection
    if (isLow) {
      actions.push({
        type: "log_insight",
        label: "Energy is low - consider lighter tasks",
        details: {
          insight: "Your energy is low. Consider focusing on lighter, less demanding tasks today.",
          priority: "medium",
        },
        requiresConfirmation: false,
        riskLevel: "low",
      });
    }

    // Positive momentum support
    if (emotionState.includes("energized") || emotionState.includes("hyped")) {
      const highValueDeals = (world.work.activeDeals || []).filter(
        (d: any) => d.amount && d.amount > 10000
      );
      if (highValueDeals.length > 0) {
        actions.push({
          type: "nudge_user",
          label: "Channel this energy into high-value opportunities",
          details: {
            message: `You're feeling energized! Consider focusing on ${highValueDeals.length} high-value deal(s).`,
            domain: "work",
          },
          requiresConfirmation: false,
          riskLevel: "low",
        });
      }
    }

    // Use predictions to add proactive support
    if (predictions?.likelyAfternoonStress === "high" && !isStressed) {
      // Proactive: add supportive actions before stress hits
      actions.push({
        type: "nudge_user",
        label: "Afternoon stress predicted - consider scheduling a break",
        details: {
          message: "Based on your schedule and patterns, afternoon stress is likely. Consider scheduling a break or lighter tasks for later today.",
          domain: "health",
        },
        requiresConfirmation: false,
        riskLevel: "low",
      });
    }

    const reasoning = isRisingStress
      ? `Stress is rising (trend: ${emotionTrend}, intensity: ${Math.round(emotionIntensity * 100)}%) - prioritizing recovery actions.`
      : isStressed
      ? `User is feeling ${emotionState} - proposing supportive actions.`
      : isLow
      ? "Energy is low - suggesting lighter workload."
      : emotionState.includes("energized")
      ? "User is energized - suggesting channeling into high-value work."
      : predictions?.likelyAfternoonStress === "high"
      ? "Afternoon stress predicted - proposing proactive mitigations."
      : `Emotional state is ${emotionState || "stable"} (trend: ${emotionTrend}).`;

    const confidence = isRisingStress ? 0.9 : isStressed || isLow ? 0.8 : emotionState.includes("energized") ? 0.7 : predictions?.likelyAfternoonStress === "high" ? 0.65 : 0.4;

    return makeAgentResult("EmotionAgent", reasoning, actions, confidence);
  },
};

