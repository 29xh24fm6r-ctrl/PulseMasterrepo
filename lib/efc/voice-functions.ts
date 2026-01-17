// Voice function handlers for Executive Function Cortex
// Add these to your voice function-call route

import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { ActionGenerator } from "./action-generator";
import { PriorityEngine } from "./priority-engine";
import { EnergyMatcher } from "./energy-matcher";
import { FollowThroughTracker } from "./follow-through-tracker";
import { ActionSequencer } from "./action-sequencer";
import { EFC } from "./index";



// Voice function definitions for OpenAI
export const EFC_VOICE_TOOLS = [
  {
    type: "function",
    name: "get_daily_briefing",
    description: "Get today's executive briefing with priorities, energy state, and commitments",
    parameters: { type: "object", properties: {}, required: [] }
  },
  {
    type: "function",
    name: "get_top_priorities",
    description: "Get the top priority actions to focus on right now",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of priorities (default 5)" }
      },
      required: []
    }
  },
  {
    type: "function",
    name: "record_energy",
    description: "Record current energy level for better task matching",
    parameters: {
      type: "object",
      properties: {
        energy_level: { type: "string", enum: ["high", "medium", "low", "recovery"] },
        notes: { type: "string", description: "Optional notes about energy state" }
      },
      required: ["energy_level"]
    }
  },
  {
    type: "function",
    name: "create_commitment",
    description: "Create a new commitment, promise, or goal to track",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "What you're committing to" },
        commitment_type: { type: "string", enum: ["promise", "deadline", "goal", "habit"] },
        made_to: { type: "string", description: "Person you made the commitment to (if applicable)" },
        due_date: { type: "string", description: "Due date (tomorrow, next week, specific date)" }
      },
      required: ["title", "commitment_type"]
    }
  },
  {
    type: "function",
    name: "update_commitment_progress",
    description: "Update progress on a commitment",
    parameters: {
      type: "object",
      properties: {
        commitment_title: { type: "string", description: "Title of the commitment" },
        progress: { type: "number", description: "Progress percentage (0-100)" },
        notes: { type: "string", description: "Update notes" }
      },
      required: ["commitment_title", "progress"]
    }
  },
  {
    type: "function",
    name: "what_should_i_do",
    description: "Get an energy-matched recommendation for what to do right now",
    parameters: { type: "object", properties: {}, required: [] }
  },
  {
    type: "function",
    name: "generate_focus_block",
    description: "Generate a focused sequence of tasks for deep work",
    parameters: {
      type: "object",
      properties: {
        duration_minutes: { type: "number", description: "Length of focus block (default 90)" },
        focus_area: { type: "string", description: "What to focus on (optional)" }
      },
      required: []
    }
  },
  {
    type: "function",
    name: "get_follow_through_score",
    description: "Get your follow-through score and commitment stats",
    parameters: { type: "object", properties: {}, required: [] }
  }
];

// Voice function handlers
export async function handleEFCVoiceFunction(
  userId: string,
  functionName: string,
  args: any
): Promise<any> {
  switch (functionName) {
    case "get_daily_briefing": {
      const briefing = await EFC.getDailyBriefing(userId);
      return {
        energy: `${briefing.energy_state.current_level} energy (${briefing.energy_state.trend})`,
        top_priority: briefing.top_priorities[0]?.title || "No priorities set",
        priorities: briefing.top_priorities.slice(0, 3).map(p => p.title),
        commitment_count: briefing.active_commitments.length,
        pending_nudges: briefing.pending_nudges.length,
        follow_through_score: `${briefing.follow_through_score}%`,
      };
    }

    case "get_top_priorities": {
      const { limit = 5 } = args;
      const energyState = await EnergyMatcher.getCurrentEnergyState(userId);
      const priorities = await PriorityEngine.getTopPriorities(userId, {
        energy_state: energyState || undefined,
        limit,
      });
      return {
        priorities: priorities.map(p => ({
          title: p.title,
          urgency: p.urgency,
          importance: p.importance,
          estimated_minutes: p.estimated_minutes,
          reasoning: p.reasoning,
        })),
        count: priorities.length,
      };
    }

    case "record_energy": {
      const { energy_level, notes } = args;
      const energyState = await EnergyMatcher.recordEnergyState(userId, {
        energy_level,
        notes,
      });
      await PriorityEngine.updateStoredPriorities(userId, energyState);
      return {
        recorded: energy_level,
        optimal_for: energyState.optimal_task_types,
        message: `Got it, you're at ${energy_level} energy. I'll adjust your recommendations.`,
      };
    }

    case "create_commitment": {
      const { title, commitment_type, made_to, due_date } = args;

      // Parse due date if provided
      let due_at: string | undefined;
      if (due_date) {
        const parsed = parseDateExpression(due_date);
        due_at = parsed?.toISOString();
      }

      const commitment = await FollowThroughTracker.createCommitment(userId, {
        commitment_type,
        title,
        made_to,
        due_at,
      });
      return {
        created: true,
        title: commitment.title,
        type: commitment.commitment_type,
        due: commitment.due_at ? new Date(commitment.due_at).toLocaleDateString() : "No deadline",
        message: `I'll track "${title}"${made_to ? ` for ${made_to}` : ""}. I'll nudge you to follow through.`,
      };
    }

    case "update_commitment_progress": {
      const { commitment_title, progress, notes } = args;

      // Find commitment by title
      const commitments = await FollowThroughTracker.getActiveCommitments(userId);
      const commitment = commitments.find(c =>
        c.title.toLowerCase().includes(commitment_title.toLowerCase())
      );

      if (!commitment) {
        return { error: `Couldn't find commitment matching "${commitment_title}"` };
      }

      const updated = await FollowThroughTracker.updateCommitmentProgress(
        userId,
        commitment.id,
        progress,
        notes
      );

      return {
        updated: true,
        title: updated.title,
        progress: `${updated.progress}%`,
        status: updated.status,
        message: progress >= 100
          ? `🎉 Great job completing "${updated.title}"!`
          : `Updated "${updated.title}" to ${progress}% complete.`,
      };
    }

    case "what_should_i_do": {
      const energyState = await EnergyMatcher.getCurrentEnergyState(userId);
      const rawActions = await ActionGenerator.getSuggestedActions(userId, { limit: 20 });
      let actions = PriorityEngine.prioritizeActions({ actions: rawActions, energy_state: energyState || undefined });

      if (rawActions.length === 0) {
        // Generate fresh actions
        const fresh = await ActionGenerator.generateActions(userId, {
          include_calendar: true,
          include_tasks: true,
          max_actions: 5,
        });
        await ActionGenerator.storeGeneratedActions(userId, fresh);
        const prioritized = PriorityEngine.prioritizeActions({ actions: fresh });
        actions = prioritized;
      }

      const recommendations = await EnergyMatcher.getEnergyMatchedRecommendations(
        userId,
        actions,
        3
      );

      const top = recommendations.recommendations[0];
      return {
        recommendation: top?.title || "Take a break",
        reasoning: top?.reasoning || "No specific actions right now",
        estimated_minutes: top?.estimated_minutes || 0,
        energy_match: recommendations.explanation,
        alternatives: recommendations.recommendations.slice(1).map(r => r.title),
      };
    }

    case "generate_focus_block": {
      const { duration_minutes = 90, focus_area } = args;
      const energyState = await EnergyMatcher.getCurrentEnergyState(userId);
      const actions = await PriorityEngine.getTopPriorities(userId, {
        energy_state: energyState || undefined,
        limit: 20,
      });

      const sequence = ActionSequencer.generateFocusBlockSequence(actions, {
        durationMinutes: duration_minutes,
        energy: energyState?.current_level || "medium",
        focusArea: focus_area,
      });

      return {
        title: sequence.title,
        duration: `${sequence.total_minutes} minutes`,
        actions: sequence.actions.map(a => ({
          title: a.title,
          minutes: a.estimated_minutes,
        })),
        message: `Here's your ${duration_minutes}-minute focus block${focus_area ? ` for ${focus_area}` : ""}.`,
      };
    }

    case "get_follow_through_score": {
      const score = await FollowThroughTracker.calculateFollowThroughScore(userId);
      const commitments = await FollowThroughTracker.getActiveCommitments(userId, { limit: 5 });

      return {
        score: `${score.score}%`,
        completed: score.completed,
        active: score.active,
        broken: score.broken,
        on_time_rate: `${Math.round((score.onTime / (score.onTime + score.late || 1)) * 100)}%`,
        active_commitments: commitments.map(c => c.title),
        message: score.score >= 80
          ? `Great follow-through at ${score.score}%!`
          : `Your follow-through is at ${score.score}%. Let's work on that.`,
      };
    }

    default:
      return { error: `Unknown EFC function: ${functionName}` };
  }
}

// Helper to parse natural language dates
function parseDateExpression(expr: string): Date | null {
  const lower = expr.toLowerCase();
  const now = new Date();

  if (lower.includes("tomorrow")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return d;
  }
  if (lower.includes("next week")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    d.setHours(17, 0, 0, 0);
    return d;
  }
  if (lower.includes("end of week") || lower.includes("friday")) {
    const d = new Date(now);
    const daysUntilFriday = (5 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilFriday);
    d.setHours(17, 0, 0, 0);
    return d;
  }
  if (lower.includes("end of month")) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    d.setHours(17, 0, 0, 0);
    return d;
  }

  // Try parsing as date
  const parsed = new Date(expr);
  return isNaN(parsed.getTime()) ? null : parsed;
}