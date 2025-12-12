// Work Domain Autonomy Policies v3
// lib/cortex/autonomy/policies/work-policies.ts

import { registerPolicy, AutonomyPolicy, AutonomyAction } from "../v3";
import { PulseCortexContext } from "../../types";
import { PulseCortexContext } from "../../types";

/**
 * Policy: Stalled Project Recovery
 */
const stalledProjectPolicy: AutonomyPolicy = {
  id: "work:stalled_project",
  domain: "work",
  name: "Stalled Project Recovery",
  description: "Alert when active projects have stalled",
  priority: 10,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    if (!ctx.domains.work?.activeProjects) return actions;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const project of ctx.domains.work.activeProjects) {
      const lastActivity = new Date(project.lastActivityAt);
      if (lastActivity < sevenDaysAgo) {
        const daysSince = Math.floor(
          (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
        );

        actions.push({
          id: `project_recovery_${project.id}`,
          domain: "work",
          title: `Revive project: ${project.name}`,
          description: `No activity in ${daysSince} days`,
          severity: daysSince > 14 ? "warning" : "info",
          payload: {
            type: "project_recovery",
            projectId: project.id,
            projectName: project.name,
            suggestedAction: "review_and_plan_next_steps",
          },
          metadata: { daysSinceActivity: daysSince },
        });
      }
    }

    return actions;
  },
};

/**
 * Policy: Follow-up Debt Spike
 */
const followupDebtPolicy: AutonomyPolicy = {
  id: "work:followup_debt",
  domain: "work",
  name: "Follow-up Debt Spike",
  description: "Alert when follow-ups are accumulating",
  priority: 8,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    if (!ctx.domains.work?.queue) return actions;

    const followups = ctx.domains.work.queue.filter(
      (item) => item.source === "email_followup" || item.source === "relationship_nudge"
    );

    if (followups.length >= 5) {
      actions.push({
        id: "followup_debt_alert",
        domain: "work",
        title: `Clear follow-up debt (${followups.length} items)`,
        description: "You have multiple pending follow-ups. Consider a follow-up block.",
        severity: followups.length >= 10 ? "warning" : "info",
        payload: {
          type: "followup_block_suggestion",
          count: followups.length,
          suggestedAction: "schedule_followup_block",
        },
        metadata: { followupCount: followups.length },
      });
    }

    return actions;
  },
};

/**
 * Policy: After-Meeting Action Extraction
 */
const meetingActionExtractionPolicy: AutonomyPolicy = {
  id: "work:meeting_actions",
  domain: "work",
  name: "After-Meeting Action Extraction",
  description: "Extract actionable items from meeting notes",
  priority: 5,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    const recentMeetings = ctx.memory.recentEvents.filter(
      (e) => e.type === "meeting" || e.type === "call"
    );

    for (const meeting of recentMeetings.slice(0, 3)) {
      const hasActions = ctx.memory.topMemories.some(
        (m) => m.key.includes(`meeting:${meeting.id}:actions`)
      );

      if (
        !hasActions &&
        meeting.occurredAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ) {
        actions.push({
          id: `extract_actions_${meeting.id}`,
          domain: "work",
          title: `Extract actions from: ${meeting.title || "Recent meeting"}`,
          description: "Review meeting notes and create tasks",
          severity: "info",
          payload: {
            type: "action_extraction",
            meetingId: meeting.id,
            meetingTitle: meeting.title,
            suggestedAction: "review_and_create_tasks",
          },
        });
      }
    }

    return actions;
  },
};

/**
 * Policy: Burnout Window Detected (using Longitudinal Model)
 */
const burnoutWindowPolicy: AutonomyPolicy = {
  id: "work:burnout_window",
  domain: "work",
  name: "Burnout Window Detected",
  description: "Alert when longitudinal patterns indicate burnout risk",
  priority: 15,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    const burnoutPatterns = ctx.longitudinal.aggregatedPatterns.filter(
      (p) => p.type === "burnout_cycle"
    );

    if (burnoutPatterns.length > 0) {
      const recentPattern = burnoutPatterns[0];
      const isRecent = recentPattern.endDate
        ? new Date(recentPattern.endDate).getTime() >
          Date.now() - 14 * 24 * 60 * 60 * 1000
        : false;

      if (isRecent || !recentPattern.endDate) {
        actions.push({
          id: "burnout_window_alert",
          domain: "work",
          title: "⚠️ Burnout Window Detected",
          description: "Historical patterns suggest you're in a burnout risk window. Consider reducing workload.",
          severity: "warning",
          requiresConfirmation: false,
          payload: {
            type: "burnout_alert",
            suggestedAction: "reduce_workload",
            patternStrength: recentPattern.strength,
          },
          metadata: {
            patternId: recentPattern.id,
            patternDescription: recentPattern.description,
          },
        });
      }
    }

    return actions;
  },
};

/**
 * Policy: Opportunity Window - High Momentum
 */
const opportunityWindowPolicy: AutonomyPolicy = {
  id: "work:opportunity_window",
  domain: "work",
  name: "Opportunity Window: High Momentum",
  description: "Detect high-productivity periods for capitalizing",
  priority: 7,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    const productivityArcs = ctx.longitudinal.aggregatedPatterns.filter(
      (p) => p.type === "productivity_arc"
    );

    if (productivityArcs.length > 0) {
      const recentArc = productivityArcs[0];
      const isActive = !recentArc.endDate || new Date(recentArc.endDate) > new Date();

      if (isActive && recentArc.strength > 0.7) {
        actions.push({
          id: "opportunity_window",
          domain: "work",
          title: "🚀 High Momentum Window",
          description: "You're in a high-productivity period. Consider tackling important projects now.",
          severity: "info",
          payload: {
            type: "opportunity_alert",
            suggestedAction: "prioritize_important_projects",
            momentumStrength: recentArc.strength,
          },
          metadata: {
            patternId: recentArc.id,
            patternDescription: recentArc.description,
          },
        });
      }
    }

    return actions;
  },
};

// Register all policies
registerPolicy(stalledProjectPolicy);
registerPolicy(followupDebtPolicy);
registerPolicy(meetingActionExtractionPolicy);
registerPolicy(burnoutWindowPolicy);
registerPolicy(opportunityWindowPolicy);

