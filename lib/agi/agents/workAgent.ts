// Work Agent - Deals, deadlines, work projects
// lib/agi/agents/workAgent.ts

import { Agent, makeAgentResult } from "../agents";
import { AgentContext, AGIAction } from "../types";

export const workAgent: Agent = {
  name: "WorkAgent",
  description: "Focuses on deals, pipelines, risk ratings, and key deadlines.",
  priority: 75,

  async run(ctx: AgentContext) {
    const actions: AGIAction[] = [];
    const { world, trigger } = ctx;

    // Use email perception if available
    const urgentEmails = world.email?.urgentThreads || [];
    const waitingOnUser = world.email?.waitingOnUser || [];
    const riskThreads = world.email?.riskThreads || [];

    // Key deadlines approaching
    const deadlines = world.work.keyDeadlines || [];
    const upcomingDeadlines = deadlines.filter((d: any) => {
      if (!d.dueDate) return false;
      const daysUntil = Math.floor(
        (new Date(d.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil >= 0 && daysUntil <= 7;
    });

    if (upcomingDeadlines.length > 0) {
      actions.push({
        type: "create_task",
        label: `Prepare for ${upcomingDeadlines.length} upcoming deadline${upcomingDeadlines.length > 1 ? "s" : ""}`,
        details: {
          title: "Deadline preparation",
          when: "this_week",
          metadata: { deadlines: upcomingDeadlines },
        },
        requiresConfirmation: false,
        riskLevel: "medium",
      });
    }

    // Active deals need follow-up
    const activeDeals = world.work.activeDeals || [];
    const stalledDeals = activeDeals.filter((d: any) => {
      // Deals without recent activity (simplified check)
      return d.stage && !["won", "lost"].includes(d.stage);
    });

    if (stalledDeals.length > 3) {
      actions.push({
        type: "log_insight",
        label: `Review ${stalledDeals.length} active deals for follow-up opportunities`,
        details: {
          insight: `${stalledDeals.length} active deals may need follow-up or attention.`,
          priority: "high",
        },
        requiresConfirmation: false,
        riskLevel: "low",
      });
    }

    // High-value deals approaching close date
    const highValueDeals = activeDeals.filter((d: any) => {
      if (!d.closeDate || !d.amount) return false;
      const daysUntil = Math.floor(
        (new Date(d.closeDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil >= 0 && daysUntil <= 14 && d.amount > 10000;
    });

    if (highValueDeals.length > 0) {
      actions.push({
        type: "create_task",
        label: `Focus on ${highValueDeals.length} high-value deal${highValueDeals.length > 1 ? "s" : ""} closing soon`,
        details: {
          title: "High-value deal focus",
          when: "this_week",
          domain: "work",
          metadata: { deals: highValueDeals },
        },
        requiresConfirmation: true,
        riskLevel: "high",
      });
    }

    // Email follow-ups needed (use perception data)
    if (waitingOnUser.length > 0) {
      const urgentCount = urgentEmails.length;
      const waitingCount = waitingOnUser.length;
      
      if (urgentCount > 0) {
        actions.push({
          type: "create_task",
          label: `Reply to ${urgentCount} urgent email thread(s)`,
          details: {
            title: `Email follow-ups (${urgentCount} urgent)`,
            when: "today",
            domain: "work",
            metadata: { urgentThreads: urgentCount, waitingOnUser: waitingCount },
          },
          requiresConfirmation: true,
          riskLevel: "medium",
        });
      } else if (waitingCount > 3) {
        actions.push({
          type: "log_insight",
          label: `${waitingCount} email thread(s) waiting on your reply`,
          details: {
            insight: `You have ${waitingCount} email thread(s) where you're the next expected responder. Consider scheduling time to catch up.`,
            priority: "medium",
            domain: "work",
          },
          requiresConfirmation: false,
          riskLevel: "low",
        });
      }
    }

    // Risk threads (important contacts with no reply)
    if (riskThreads.length > 0) {
      actions.push({
        type: "log_insight",
        label: `${riskThreads.length} high-stakes email thread(s) need attention`,
        details: {
          insight: `${riskThreads.length} email thread(s) from important contacts have been waiting for a reply. These may be deal-related or high-stakes.`,
          priority: "high",
          domain: "work",
          subsource: "email_perception/risk_thread",
        },
        requiresConfirmation: false,
        riskLevel: "medium",
      });
    }

    // NEW: Pipeline Chief-of-Staff Mode for Midday Ritual
    const isMiddayRitual = trigger?.type === "schedule_tick" && trigger?.source === "ritual/midday";
    if (isMiddayRitual) {
      // Top 3 deals that need movement
      const topDealsToMove = activeDeals
        .filter((d: any) => d.stage && !["won", "lost"].includes(d.stage))
        .sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0))
        .slice(0, 3);

      if (topDealsToMove.length > 0) {
        actions.push({
          type: "create_task",
          label: `Midday Pipeline Focus: Advance ${topDealsToMove.length} key deal(s)`,
          details: {
            title: "Midday Pipeline Review",
            description: `Focus on these top deals: ${topDealsToMove.map((d: any) => d.name).join(", ")}. Identify next steps.`,
            when: "today",
            priority: 0.9,
            domain: "work",
            subdomain: "pipeline",
            subsource: "ritual/midday/pipeline_focus",
            metadata: { deals: topDealsToMove.map((d: any) => ({ id: d.id, name: d.name })) },
          },
          requiresConfirmation: false,
          riskLevel: "low",
        });
      }

      // Top 2 key follow-up emails
      const keyEmailFollowUps = [...urgentEmails, ...waitingOnUser].slice(0, 2);
      if (keyEmailFollowUps.length > 0) {
        actions.push({
          type: "create_task",
          label: `Midday Pipeline Focus: Follow up on ${keyEmailFollowUps.length} key email(s)`,
          details: {
            title: "Midday Email Follow-up",
            description: `Address these important emails: ${keyEmailFollowUps.map((e: any) => e.subject || "Untitled").join(", ")}.`,
            when: "today",
            priority: 0.8,
            domain: "work",
            subdomain: "pipeline",
            subsource: "ritual/midday/email_followup",
          },
          requiresConfirmation: false,
          riskLevel: "low",
        });
      }

      // 1 relationship touchpoint (important contacts at risk or due for check-in)
      const importantAtRisk = (world.relationships.atRiskRelationships || []).filter((r: any) =>
        (world.relationships.importantContacts || []).some((ic: any) => ic.id === r.id)
      ).slice(0, 1);
      const importantCheckinsDue = (world.relationships.checkinsDue || []).filter((r: any) =>
        (world.relationships.importantContacts || []).some((ic: any) => ic.id === r.id)
      ).slice(0, 1);

      if (importantAtRisk.length > 0 || importantCheckinsDue.length > 0) {
        const contact = importantAtRisk[0] || importantCheckinsDue[0];
        actions.push({
          type: "create_task",
          label: `Midday Pipeline Focus: Touch base with key contact ${contact.name}`,
          details: {
            title: `Midday Relationship Touchpoint: ${contact.name}`,
            description: `Reach out to ${contact.name} to maintain the relationship.`,
            when: "today",
            priority: 0.7,
            domain: "relationships",
            subdomain: "pipeline",
            subsource: "ritual/midday/relationship_touchpoint",
          },
          requiresConfirmation: false,
          riskLevel: "low",
        });
      }
    }

    const reasoning =
      isMiddayRitual
        ? `Midday ritual: focusing on pipeline movement, top deals, and key emails.`
        : upcomingDeadlines.length > 0
        ? `${upcomingDeadlines.length} deadline(s) approaching in the next 7 days.`
        : stalledDeals.length > 3
        ? `${stalledDeals.length} active deals may need follow-up.`
        : highValueDeals.length > 0
        ? `${highValueDeals.length} high-value deal(s) closing soon.`
        : urgentEmails.length > 0
        ? `${urgentEmails.length} urgent email thread(s) need attention.`
        : waitingOnUser.length > 3
        ? `${waitingOnUser.length} email thread(s) waiting on your reply.`
        : "Work pipeline is stable.";

    const confidence =
      isMiddayRitual
        ? 0.95 // High confidence for ritual-driven actions
        : upcomingDeadlines.length > 0
        ? 0.9
        : stalledDeals.length > 3
        ? 0.7
        : highValueDeals.length > 0
        ? 0.85
        : urgentEmails.length > 0
        ? 0.8
        : waitingOnUser.length > 3
        ? 0.6
        : 0.4;

    return makeAgentResult("WorkAgent", reasoning, actions, confidence);
  },
};

