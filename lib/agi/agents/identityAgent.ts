// Identity Agent v2 - Ensures actions align with values, roles, long-term goals
// lib/agi/agents/identityAgent.ts

import { Agent, makeAgentResult } from "../agents";
import { AgentContext, AGIAction } from "../types";

/**
 * Check if an action conflicts with identity (roles/values/priorities)
 */
function checkIdentityConflict(
  action: AGIAction,
  identity: {
    roles: string[];
    priorities: string[];
    values?: string[];
    archetype?: string;
    strengths?: string[];
    blindspots?: string[];
  }
): { conflicts: boolean; reason?: string; score: number } {
  let conflictScore = 0;
  const reasons: string[] = [];

  // Check against blindspots
  if (identity.blindspots) {
    if (identity.blindspots.includes("task_avoidance") && action.type === "create_task") {
      // Creating tasks when user avoids them - this is actually GOOD, not a conflict
      conflictScore -= 0.1; // Boost score
    }
    if (identity.blindspots.includes("relationship_neglect") && action.type === "update_relationship_plan") {
      conflictScore -= 0.1; // Good alignment
    }
  }

  // Check role alignment
  if (identity.roles.length > 0) {
    const hasFamilyRole = identity.roles.some((r) =>
      r.toLowerCase().includes("dad") ||
      r.toLowerCase().includes("mom") ||
      r.toLowerCase().includes("parent")
    );
    const hasWorkRole = identity.roles.some((r) =>
      r.toLowerCase().includes("founder") ||
      r.toLowerCase().includes("officer") ||
      r.toLowerCase().includes("executive") ||
      r.toLowerCase().includes("loan")
    );

    // If action is work-focused but user has strong family role, check for conflict
    if (hasFamilyRole && !hasWorkRole && action.details?.domain === "work") {
      // Not necessarily a conflict, but worth noting
      if (action.riskLevel === "high") {
        conflictScore += 0.1;
        reasons.push("High-risk work action when family role is primary");
      }
    }
  }

  // Check priority alignment
  if (identity.priorities.length > 0) {
    const actionLabel = action.label.toLowerCase();
    const priorityKeywords = identity.priorities.join(" ").toLowerCase();
    
    // Simple keyword matching - if action mentions priority keywords, boost
    const matchesPriority = identity.priorities.some((p) =>
      actionLabel.includes(p.toLowerCase().substring(0, 10))
    );
    
    if (matchesPriority) {
      conflictScore -= 0.15; // Strong alignment
    }
  }

  // Check archetype alignment
  if (identity.archetype) {
    const archetype = identity.archetype.toLowerCase();
    
    // Warrior archetype prefers action-oriented tasks
    if (archetype === "warrior" && action.type === "create_task") {
      conflictScore -= 0.05;
    }
    
    // Stoic archetype prefers calm, non-reactive actions
    if (archetype === "stoic" && action.type === "nudge_user" && action.details?.message?.includes("urgent")) {
      conflictScore += 0.1;
      reasons.push("Urgent nudges conflict with Stoic archetype");
    }
    
    // Creator archetype prefers creative/exploratory actions
    if (archetype === "creator" && action.type === "log_insight") {
      conflictScore -= 0.05;
    }
  }

  return {
    conflicts: conflictScore > 0.1,
    reason: reasons.length > 0 ? reasons.join("; ") : undefined,
    score: conflictScore,
  };
}

export const identityAgent: Agent = {
  name: "IdentityAgent",
  description: "Ensures actions align with user's values, roles, archetypes, and long-term goals.",
  priority: 90, // High priority - runs early

  async run(ctx: AgentContext) {
    const actions: AGIAction[] = [];
    const { world } = ctx;

    const identity = world.identity;
    const priorities = identity.priorities || [];
    const roles = identity.roles || [];
    const values = identity.values || [];
    const archetype = identity.archetype;
    const strengths = identity.strengths || [];
    const blindspots = identity.blindspots || [];

    // Check for neglected roles
    if (roles.length > 0) {
      const hasWorkRole = roles.some((r) =>
        r.toLowerCase().includes("founder") ||
        r.toLowerCase().includes("officer") ||
        r.toLowerCase().includes("executive") ||
        r.toLowerCase().includes("loan")
      );
      const hasFamilyRole = roles.some((r) =>
        r.toLowerCase().includes("dad") ||
        r.toLowerCase().includes("mom") ||
        r.toLowerCase().includes("parent")
      );

      // Check if work role is being neglected
      if (hasWorkRole && (world.work.activeDeals?.length ?? 0) === 0 && (world.time.todayTasks?.length ?? 0) < 3) {
        actions.push({
          type: "log_insight",
          label: "Schedule time for your work role",
          details: {
            insight: `Your work role (${roles.find((r) => r.toLowerCase().includes("founder") || r.toLowerCase().includes("officer") || r.toLowerCase().includes("loan"))}) may need attention. Consider adding deals or key work tasks.`,
            priority: "medium",
          },
          requiresConfirmation: false,
          riskLevel: "low",
        });
      }

      // Check if family role is being neglected
      if (hasFamilyRole) {
        const familyRelatedTasks = (world.time.todayTasks || []).filter((t: any) =>
          t.name?.toLowerCase().includes("family") ||
          t.name?.toLowerCase().includes("kid") ||
          t.name?.toLowerCase().includes("parent")
        );
        if (familyRelatedTasks.length === 0 && (world.time.todayTasks?.length ?? 0) > 5) {
          actions.push({
            type: "log_insight",
            label: "Ensure family role gets attention",
            details: {
              insight: "Your family role is important. Consider scheduling time for family activities or check-ins.",
              priority: "medium",
            },
            requiresConfirmation: false,
            riskLevel: "low",
          });
        }
      }
    }

    // Check priority alignment
    if (priorities.length > 0) {
      const todayTaskCount = world.time.todayTasks?.length ?? 0;
      if (todayTaskCount > 0) {
        // Suggest alignment check
        actions.push({
          type: "log_insight",
          label: "Verify today's tasks align with your priorities",
          details: {
            insight: `You have ${todayTaskCount} task(s) today. Ensure they align with your priorities: ${priorities.slice(0, 3).join(", ")}.`,
            priority: "medium",
          },
          requiresConfirmation: false,
          riskLevel: "low",
        });
      }
    }

    // Address blindspots proactively
    if (blindspots.length > 0) {
      if (blindspots.includes("task_avoidance")) {
        actions.push({
          type: "create_task",
          label: "Triage overdue tasks to reduce avoidance pattern",
          details: {
            title: "Task triage session",
            when: "today",
            metadata: { reason: "address_task_avoidance_blindspot" },
          },
          requiresConfirmation: true,
          riskLevel: "low",
        });
      }

      if (blindspots.includes("relationship_neglect")) {
        actions.push({
          type: "update_relationship_plan",
          label: "Create relationship repair plan",
          details: {
            reason: "address_relationship_neglect_blindspot",
            relationships: world.relationships.atRiskRelationships,
          },
          requiresConfirmation: true,
          riskLevel: "medium",
        });
      }
    }

    // Leverage strengths
    if (strengths.includes("consistency") && (world.time.overdueTasks?.length ?? 0) > 0) {
      actions.push({
        type: "nudge_user",
        label: "Use your consistency strength to clear overdue tasks",
        details: {
          message: "You have a strength in consistency. Apply it to clear overdue tasks systematically.",
        },
        requiresConfirmation: false,
        riskLevel: "low",
      });
    }

    const reasoning =
      priorities.length > 0 || roles.length > 0
        ? `Checking alignment with ${roles.length} role(s), ${priorities.length} priority/priorities, archetype: ${archetype || "unknown"}. ${blindspots.length > 0 ? `Addressing ${blindspots.length} blindspot(s).` : ""}`
        : "No specific identity constraints detected.";

    const confidence = priorities.length > 0 || roles.length > 0 || archetype ? 0.7 : 0.3;

    return makeAgentResult("IdentityAgent", reasoning, actions, confidence);
  },
};

