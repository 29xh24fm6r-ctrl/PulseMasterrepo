// Planning & Arbitration Layer v2 - Multi-Factor Scoring
// lib/agi/planner.ts

import { AgentResult, AGIAction, WorldState } from "./types";
import { AGIUserProfile } from "./settings";

interface PlannerOptions {
  maxActions?: number;
  profile?: AGIUserProfile;
}

/**
 * Check identity alignment for an action
 */
function scoreIdentityAlignment(action: AGIAction, identity: WorldState["identity"]): number {
  let score = 0;

  // Check if action aligns with priorities
  if (identity.priorities.length > 0) {
    const actionLabel = action.label.toLowerCase();
    const matchesPriority = identity.priorities.some((p) =>
      actionLabel.includes(p.toLowerCase().substring(0, 10))
    );
    if (matchesPriority) score += 0.1;
  }

  // Check if action addresses blindspots (positive)
  if (identity.blindspots && identity.blindspots.length > 0) {
    if (identity.blindspots.includes("task_avoidance") && action.type === "create_task") {
      score += 0.15; // Strong positive alignment
    }
    if (identity.blindspots.includes("relationship_neglect") && action.type === "update_relationship_plan") {
      score += 0.15;
    }
  }

  // Check archetype alignment
  if (identity.archetype) {
    const archetype = identity.archetype.toLowerCase();
    if (archetype === "warrior" && action.type === "create_task") score += 0.05;
    if (archetype === "stoic" && action.type === "nudge_user" && action.details?.message?.includes("urgent")) {
      score -= 0.1; // Conflict with Stoic archetype
    }
  }

  return score;
}

/**
 * Score emotional cost/benefit
 */
function scoreEmotionalImpact(action: AGIAction, emotion?: WorldState["emotion"]): number {
  if (!emotion) return 0;

  let score = 0;
  const state = emotion.currentState?.toLowerCase() || "";
  const isStressed = state.includes("stressed") || state.includes("overwhelmed");
  const trend = emotion.recentTrend || "stable";

  // When stressed, reduce complexity
  if (isStressed) {
    if (action.type === "create_task" && action.riskLevel === "high") {
      score -= 0.15; // Don't add high-risk tasks when stressed
    }
    if (action.type === "nudge_user" && action.riskLevel === "low") {
      score += 0.1; // Supportive nudges are good
    }
    if (action.requiresConfirmation === false && action.riskLevel !== "low") {
      score -= 0.1; // Don't auto-execute medium/high risk when stressed
    }
  }

  // When stress is rising, prioritize recovery actions
  if (trend === "rising" && isStressed) {
    if (action.type === "log_insight" && action.details?.insight?.toLowerCase().includes("break")) {
      score += 0.1;
    }
  }

  // When energized, boost high-value actions
  if (state.includes("energized") || state.includes("hyped")) {
    if (action.type === "create_task" && action.riskLevel === "medium") {
      score += 0.05; // Can handle more when energized
    }
  }

  return score;
}

/**
 * Estimate time cost (simplified heuristic)
 */
function estimateTimeCost(action: AGIAction): number {
  // Lower score = less time cost = better
  const timeCosts: Record<AGIAction["type"], number> = {
    create_task: 0.1,
    update_task: 0.05,
    send_email_draft: 0.15,
    log_insight: 0.0,
    schedule_simulation: 0.0,
    update_relationship_plan: 0.2,
    update_finance_plan: 0.2,
    nudge_user: 0.0,
    noop: 0.0,
  };

  return timeCosts[action.type] || 0.1;
}

export function planFromAgentResults(
  world: WorldState,
  agentResults: AgentResult[],
  opts: PlannerOptions = {}
): AGIAction[] {
  const maxActions = opts.maxActions ?? 10;
  const profile = opts.profile;

  const allActions: { action: AGIAction; score: number; metadata: any }[] = [];

  for (const result of agentResults) {
    for (const action of result.proposedActions) {
      // Base score: agent confidence
      let score = result.confidence;

      // Factor 1: Agent confidence boost
      if (result.confidence > 0.8) score += 0.1;
      if (result.confidence < 0.5) score -= 0.1;

      // Factor 2: Risk level
      if (action.riskLevel === "low") score += 0.05;
      if (action.riskLevel === "high") score -= 0.05;

      // Factor 3: Emotional impact (cost/benefit)
      score += scoreEmotionalImpact(action, world.emotion);

      // Factor 4: Identity alignment
      score += scoreIdentityAlignment(action, world.identity);

      // Factor 5: Time cost (inverse - lower cost = higher score)
      const timeCost = estimateTimeCost(action);
      score += (1 - timeCost) * 0.05; // Small boost for low time cost

      // Factor 6: Long-term value (heuristic)
      // Actions that address blindspots or leverage strengths have long-term value
      if (world.identity.blindspots && world.identity.blindspots.length > 0) {
        if (action.details?.metadata?.reason?.includes("blindspot")) {
          score += 0.1; // Long-term value
        }
      }

      // Factor 7: Urgency (from world state)
      const overdueCount = world.time.overdueTasks?.length ?? 0;
      if (overdueCount > 5 && action.type === "create_task" && action.details?.title?.toLowerCase().includes("triage")) {
        score += 0.1; // Urgent context
      }

      // Factor 8: User priorities (from profile)
      if (profile) {
        const priorities = profile.priorities || {};
        const domain = action.details?.domain as string | undefined;

        if (domain && priorities[domain] === true) {
          score += 0.1; // Boost actions in prioritized domains
        }

        // Autonomy style can slightly bias more/less action density
        if (profile.autonomyStyle === "proactive") {
          score += 0.05;
        } else if (profile.autonomyStyle === "conservative") {
          score -= 0.05;
        }
      }

      // Factor 9: Ritual bias (boost actions relevant to ritual focus)
      const triggerSource = (world as any).trigger?.source || "";
      if (triggerSource.startsWith("ritual/")) {
        const ritualType = triggerSource.split("/")[1];
        const ritualFocus = (world as any).trigger?.payload?.focus || [];

        // Boost actions that match ritual focus
        if (ritualFocus.length > 0 && action.details?.domain) {
          if (ritualFocus.includes(action.details.domain)) {
            score += 0.1; // Strong boost for ritual-relevant actions
          }
        }

        // Ritual-specific biases
        if (ritualType === "morning") {
          // Morning: prioritize setting priorities, focus blocks, urgent tasks
          if (
            action.type === "create_task" &&
            (action.label.toLowerCase().includes("priority") ||
              action.label.toLowerCase().includes("focus") ||
              action.label.toLowerCase().includes("urgent"))
          ) {
            score += 0.1;
          }
        } else if (ritualType === "midday") {
          // Midday: emphasize pipeline/work actions
          if (action.details?.domain === "work" || action.details?.subdomain === "pipeline") {
            score += 0.15;
          }
        } else if (ritualType === "weekly") {
          // Weekly: emphasize reflection, planning, long-horizon
          if (
            action.type === "log_insight" ||
            action.label.toLowerCase().includes("plan") ||
            action.label.toLowerCase().includes("reflect")
          ) {
            score += 0.1;
          }
        }
      }

      // Factor 10: Prediction-based mitigation (boost actions that address predicted risks)
      const predictions = world.predictions;
      if (predictions) {
        if (predictions.likelyAfternoonStress === "high" && action.type === "nudge_user") {
          score += 0.1; // Boost supportive nudges when stress predicted
        }
        if (predictions.likelyTaskSpilloverToday && action.label.toLowerCase().includes("triage")) {
          score += 0.15; // Boost triage actions when spillover predicted
        }
        if (predictions.riskOfProcrastinationOnKeyTasks && action.type === "create_task") {
          // Boost small, atomic tasks when procrastination risk is high
          if (action.details?.metadata?.atomic === true) {
            score += 0.1;
          }
        }
      }

      allActions.push({
        action,
        score: Math.max(0, Math.min(1, score)), // Clamp to 0-1
        metadata: {
          agentConfidence: result.confidence,
          timeCost,
          identityAlignment: scoreIdentityAlignment(action, world.identity),
          emotionalImpact: scoreEmotionalImpact(action, world.emotion),
        },
      });
    }
  }

  // Sort by score DESC and trim
  return allActions
    .sort((a, b) => b.score - a.score)
    .slice(0, maxActions)
    .map((a) => a.action);
}

