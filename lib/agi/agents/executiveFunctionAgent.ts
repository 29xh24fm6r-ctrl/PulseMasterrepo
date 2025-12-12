// Executive Function Agent v2 - Prefrontal Cortex
// lib/agi/agents/executiveFunctionAgent.ts

import { Agent, makeAgentResult } from "../agents";
import { AgentContext, AGIAction } from "../types";

export const executiveFunctionAgent: Agent = {
  name: "ExecutiveFunctionAgent",
  description: "Detects overload, procrastination patterns, and optimizes task sequencing.",
  priority: 85, // High priority - runs early

  async run(ctx: AgentContext) {
    const actions: AGIAction[] = [];
    const { world } = ctx;

    const todayTasks = world.time.todayTasks || [];
    const overdueTasks = world.time.overdueTasks || [];
    const blockedItems = world.work.blockedItems || [];
    const predictions = world.predictions;

    // 1. Detect overloaded days
    const taskCount = todayTasks.length;
    const eventCount = world.time.upcomingEvents?.length || 0;
    const totalCommitments = taskCount + eventCount;

    if (totalCommitments > 10) {
      actions.push({
        type: "log_insight",
        label: "Day appears overloaded - consider simplifying",
        details: {
          insight: `You have ${totalCommitments} commitments today (${taskCount} tasks + ${eventCount} events). Consider deferring non-urgent items or breaking large tasks into smaller chunks.`,
          priority: "high",
        },
        requiresConfirmation: false,
        riskLevel: "low",
      });
    }

    // 2. Detect procrastination patterns (tasks that roll over repeatedly)
    if (overdueTasks.length > 3) {
      // Check if same tasks have been overdue for multiple days
      const oldOverdue = overdueTasks.filter((t: any) => {
        if (!t.dueDate) return false;
        const daysOverdue = Math.floor(
          (Date.now() - new Date(t.dueDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysOverdue > 3;
      });

      if (oldOverdue.length > 0) {
        actions.push({
          type: "create_task",
          label: "Triage procrastinated tasks",
          details: {
            title: "Task triage session - address procrastination pattern",
            when: "today",
            metadata: {
              reason: "procrastination_pattern_detected",
              overdueCount: oldOverdue.length,
              tasks: oldOverdue.map((t: any) => ({ id: t.id, name: t.name })),
            },
          },
          requiresConfirmation: true,
          riskLevel: "low",
        });
      }
    }

    // 3. Detect blocked items that need attention
    if (blockedItems.length > 0) {
      actions.push({
        type: "log_insight",
        label: `${blockedItems.length} blocked task(s) need unblocking`,
        details: {
          insight: `${blockedItems.length} task(s) are blocked by dependencies. Review blockers and either resolve dependencies or break tasks into independent steps.`,
          priority: "medium",
        },
        requiresConfirmation: false,
        riskLevel: "low",
      });
    }

    // 4. Suggest deep work blocks if high-value tasks exist
    const highPriorityTasks = todayTasks.filter((t: any) => t.priority && parseFloat(t.priority) > 0.7);
    if (highPriorityTasks.length >= 2 && totalCommitments < 8) {
      actions.push({
        type: "log_insight",
        label: "Schedule deep work block for high-priority tasks",
        details: {
          insight: `You have ${highPriorityTasks.length} high-priority task(s) today. Consider scheduling a 2-3 hour deep work block to tackle them without interruption.`,
          priority: "medium",
        },
        requiresConfirmation: false,
        riskLevel: "low",
      });
    }

    // 5. Suggest topic clustering
    const taskKeywords = todayTasks.map((t: any) => {
      const name = (t.name || "").toLowerCase();
      // Extract domain keywords
      if (name.includes("email") || name.includes("reply")) return "communication";
      if (name.includes("deal") || name.includes("client")) return "sales";
      if (name.includes("finance") || name.includes("bill")) return "finance";
      if (name.includes("meeting") || name.includes("call")) return "meetings";
      return "other";
    });

    const keywordGroups = taskKeywords.reduce((acc: Record<string, number>, kw) => {
      acc[kw] = (acc[kw] || 0) + 1;
      return acc;
    }, {});

    const largestGroup = Object.entries(keywordGroups).sort((a, b) => b[1] - a[1])[0];
    if (largestGroup && largestGroup[1] >= 3 && largestGroup[0] !== "other") {
      actions.push({
        type: "log_insight",
        label: `Cluster ${largestGroup[0]} tasks together`,
        details: {
          insight: `You have ${largestGroup[1]} ${largestGroup[0]}-related task(s) today. Consider grouping them into a single focused block to reduce context switching.`,
          priority: "low",
          domain: "work",
        },
        requiresConfirmation: false,
        riskLevel: "low",
      });
    }

    // 6. Use predictions to suggest proactive mitigations
    if (predictions) {
      if (predictions.likelyAfternoonStress === "high") {
        actions.push({
          type: "nudge_user",
          label: "Consider rebalancing morning vs afternoon workload",
          details: {
            message: "High afternoon stress predicted. Consider moving heavy tasks to morning or scheduling breaks.",
            domain: "work",
          },
          requiresConfirmation: false,
          riskLevel: "low",
        });
      }

      if (predictions.likelyTaskSpilloverToday) {
        actions.push({
          type: "log_insight",
          label: "Task spillover predicted - consider triage or reducing commitments",
          details: {
            insight: "Your current task load may exceed available time today. Consider triaging or deferring non-urgent items.",
            priority: "medium",
            domain: "work",
          },
          requiresConfirmation: false,
          riskLevel: "low",
        });
      }

      if (predictions.focusWindowsToday && predictions.focusWindowsToday.length > 0) {
        const bestWindow = predictions.focusWindowsToday[0];
        actions.push({
          type: "log_insight",
          label: `Recommended focus window: ${new Date(bestWindow.start).toLocaleTimeString()} - ${new Date(bestWindow.end).toLocaleTimeString()}`,
          details: {
            insight: `You have a ${bestWindow.quality} quality focus window today. Schedule your most important deep work during this time.`,
            priority: "low",
            domain: "work",
            metadata: { focusWindow: bestWindow },
          },
          requiresConfirmation: false,
          riskLevel: "low",
        });
      }
    }

    const reasoning =
      totalCommitments > 10
        ? `Day is overloaded (${totalCommitments} commitments) - suggesting simplification.`
        : overdueTasks.length > 3
        ? `${overdueTasks.length} overdue task(s) detected - possible procrastination pattern.`
        : blockedItems.length > 0
        ? `${blockedItems.length} blocked task(s) need attention.`
        : highPriorityTasks.length >= 2
        ? `${highPriorityTasks.length} high-priority task(s) - suggesting deep work block.`
        : predictions?.likelyAfternoonStress === "high"
        ? "High afternoon stress predicted - suggesting proactive mitigations."
        : predictions?.likelyTaskSpilloverToday
        ? "Task spillover predicted - suggesting triage."
        : "Day structure is reasonable.";

    const confidence =
      totalCommitments > 10
        ? 0.9
        : overdueTasks.length > 3
        ? 0.8
        : blockedItems.length > 0
        ? 0.7
        : highPriorityTasks.length >= 2
        ? 0.6
        : predictions?.likelyAfternoonStress === "high" || predictions?.likelyTaskSpilloverToday
        ? 0.75
        : 0.4;

    return makeAgentResult("ExecutiveFunctionAgent", reasoning, actions, confidence);
  },
};

