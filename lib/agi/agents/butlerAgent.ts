// Butler Agent - Execution system management
// lib/agi/agents/butlerAgent.ts

import { Agent, makeAgentResult } from "../agents";
import { AgentContext, AGIAction } from "../types";

export const butlerAgent: Agent = {
  name: "ButlerAgent",
  description: "Keeps the user's execution system clean: tasks, priorities, and schedule.",
  priority: 80,

  async run(ctx: AgentContext) {
    const actions: AGIAction[] = [];
    const { world } = ctx;

    // Overdue task triage
    const overdueCount = world.time.overdueTasks?.length ?? 0;
    if (overdueCount > 3) {
      actions.push({
        type: "create_task",
        label: "Create Triage Session for Overdue Tasks",
        details: {
          title: "Triage overdue tasks",
          when: "today",
          metadata: { overdueCount },
        },
        requiresConfirmation: true,
        riskLevel: "low",
      });
    }

    // Blocked items need attention
    const blockedCount = world.work.blockedItems?.length ?? 0;
    if (blockedCount > 0) {
      actions.push({
        type: "log_insight",
        label: `Flag ${blockedCount} blocked task${blockedCount > 1 ? "s" : ""} for review`,
        details: {
          insight: `${blockedCount} task(s) are blocked and may need attention`,
          priority: "medium",
        },
        requiresConfirmation: false,
        riskLevel: "low",
      });
    }

    // Today's tasks organization
    const todayCount = world.time.todayTasks?.length ?? 0;
    if (todayCount > 5) {
      actions.push({
        type: "create_task",
        label: "Organize today's tasks into focus blocks",
        details: {
          title: "Plan today's focus blocks",
          when: "today",
          metadata: { todayTaskCount: todayCount },
        },
        requiresConfirmation: false,
        riskLevel: "low",
      });
    }

    const reasoning =
      overdueCount > 3
        ? `User has ${overdueCount} overdue tasks. Proposed a triage block to prevent overwhelm.`
        : blockedCount > 0
        ? `${blockedCount} task(s) are blocked and may need attention.`
        : todayCount > 5
        ? `${todayCount} tasks today - suggesting organization into focus blocks.`
        : "No major execution issues detected.";

    const confidence = overdueCount > 3 ? 0.8 : blockedCount > 0 ? 0.7 : todayCount > 5 ? 0.6 : 0.4;

    return makeAgentResult("ButlerAgent", reasoning, actions, confidence);
  },
};



