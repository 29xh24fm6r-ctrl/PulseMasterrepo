// Work Domain Autonomy Policies
// lib/domains/work/autonomy.ts

import { registerAutonomyPolicy, AutonomyPolicy, AutonomyAction } from "@/lib/cortex/autonomy";
import { PulseCortexContext } from "@/lib/cortex/types";

/**
 * Policy: Stalled Project Recovery
 * Detects when projects haven't had activity in a while
 */
const stalledProjectPolicy: AutonomyPolicy = {
  id: "work:stalled_project",
  domain: "work",
  name: "Stalled Project Recovery",
  description: "Alert when active projects have stalled",
  isEnabled: true,
  priority: 10,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    if (!ctx.domains.work?.activeProjects) return actions;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const project of ctx.domains.work.activeProjects) {
      const lastActivity = new Date(project.lastActivityAt);
      if (lastActivity < sevenDaysAgo) {
        actions.push({
          id: `project_recovery_${project.id}`,
          domain: "work",
          title: `Revive project: ${project.name}`,
          description: `No activity in ${Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))} days`,
          riskLevel: "medium",
          requiresConfirmation: false,
          payload: {
            type: "project_recovery",
            projectId: project.id,
            projectName: project.name,
            suggestedAction: "review_and_plan_next_steps",
          },
          metadata: {
            daysSinceActivity: Math.floor(
              (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
            ),
          },
        });
      }
    }

    return actions;
  },
};

/**
 * Policy: Follow-up Debt Spike
 * Detects when follow-ups are piling up
 */
const followupDebtPolicy: AutonomyPolicy = {
  id: "work:followup_debt",
  domain: "work",
  name: "Follow-up Debt Spike",
  description: "Alert when email/relationship follow-ups are accumulating",
  isEnabled: true,
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
        riskLevel: "medium",
        requiresConfirmation: false,
        payload: {
          type: "followup_block_suggestion",
          count: followups.length,
          suggestedAction: "schedule_followup_block",
        },
        metadata: {
          followupCount: followups.length,
        },
      });
    }

    return actions;
  },
};

/**
 * Policy: After-Meeting Action Extraction
 * Suggests extracting tasks from recent meetings
 */
const meetingActionExtractionPolicy: AutonomyPolicy = {
  id: "work:meeting_actions",
  domain: "work",
  name: "After-Meeting Action Extraction",
  description: "Extract actionable items from meeting notes",
  isEnabled: true,
  priority: 5,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    // Check recent events for meetings
    const recentMeetings = ctx.memorySnapshot.recentEvents.filter(
      (e) => e.type === "meeting" || e.type === "call"
    );

    for (const meeting of recentMeetings.slice(0, 3)) {
      // Check if actions were already extracted (would be in memory)
      const hasActions = ctx.memorySnapshot.topMemories.some(
        (m) => m.key.includes(`meeting:${meeting.id}:actions`)
      );

      if (!hasActions && meeting.occurredAt > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
        actions.push({
          id: `extract_actions_${meeting.id}`,
          domain: "work",
          title: `Extract actions from: ${meeting.title || "Recent meeting"}`,
          description: "Review meeting notes and create tasks",
          riskLevel: "low",
          requiresConfirmation: false,
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

// Register all policies
registerAutonomyPolicy(stalledProjectPolicy);
registerAutonomyPolicy(followupDebtPolicy);
registerAutonomyPolicy(meetingActionExtractionPolicy);



