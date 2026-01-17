// Executive Function Cortex: Priority Engine
// Ranks actions by urgency, importance, energy match, and context

import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";
import {
  GeneratedAction,
  PrioritizedAction,
  EnergyState,
  ActionUrgency,
  ActionImportance,
  EnergyLevel,
  TimeBlock,
  PrioritizeInput,
} from "./types";

function getSupabase() {
  return getSupabaseAdminRuntimeClient();
}

// ============================================
// SCORING WEIGHTS
// ============================================

const WEIGHTS = {
  urgency: 0.30,
  importance: 0.25,
  energy_match: 0.20,
  time_match: 0.15,
  context_relevance: 0.10,
};

const URGENCY_SCORES: Record<ActionUrgency, number> = {
  immediate: 100,
  today: 75,
  this_week: 40,
  someday: 10,
};

const IMPORTANCE_SCORES: Record<ActionImportance, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
};

// ============================================
// ENERGY MATCHING
// ============================================

const ENERGY_MATCH_MATRIX: Record<EnergyLevel, Record<EnergyLevel, number>> = {
  high: { high: 100, medium: 70, low: 40, recovery: 20 },
  medium: { high: 60, medium: 100, low: 70, recovery: 50 },
  low: { high: 30, medium: 60, low: 100, recovery: 80 },
  recovery: { high: 10, medium: 40, low: 70, recovery: 100 },
};

function calculateEnergyMatchScore(
  actionEnergy: EnergyLevel,
  userEnergy: EnergyLevel
): number {
  return ENERGY_MATCH_MATRIX[userEnergy]?.[actionEnergy] ?? 50;
}

// ============================================
// TIME BLOCK MATCHING
// ============================================

const TIME_BLOCK_MATCH: Record<TimeBlock, Record<TimeBlock, number>> = {
  morning: { morning: 100, midday: 60, afternoon: 40, evening: 20, anytime: 80 },
  midday: { morning: 60, midday: 100, afternoon: 70, evening: 40, anytime: 80 },
  afternoon: { morning: 40, midday: 70, afternoon: 100, evening: 60, anytime: 80 },
  evening: { morning: 20, midday: 40, afternoon: 60, evening: 100, anytime: 80 },
  anytime: { morning: 80, midday: 80, afternoon: 80, evening: 80, anytime: 100 },
};

function getCurrentTimeBlock(): TimeBlock {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 14) return "midday";
  if (hour < 18) return "afternoon";
  return "evening";
}

function calculateTimeMatchScore(
  actionTimeBlock: TimeBlock,
  currentTimeBlock: TimeBlock
): number {
  return TIME_BLOCK_MATCH[currentTimeBlock]?.[actionTimeBlock] ?? 50;
}

// ============================================
// CONTEXT RELEVANCE
// ============================================

function calculateContextRelevanceScore(
  action: GeneratedAction,
  focusAreas?: string[]
): number {
  let score = 50; // Base score

  // Boost if action relates to focus areas
  if (focusAreas?.length) {
    const actionText = `${action.title} ${action.description} ${action.reasoning}`.toLowerCase();
    for (const focus of focusAreas) {
      if (actionText.includes(focus.toLowerCase())) {
        score += 20;
      }
    }
  }

  // Boost based on confidence
  score += action.confidence * 30;

  // Boost if has related entities (more connected = more relevant)
  if (action.related_entity_ids?.length) {
    score += Math.min(20, action.related_entity_ids.length * 5);
  }

  return Math.min(100, score);
}

// ============================================
// MAIN PRIORITIZATION
// ============================================

export function prioritizeActions(
  input: PrioritizeInput
): PrioritizedAction[] {
  const { actions, energy_state, available_minutes, time_block, focus_areas } = input;
  
  const currentTimeBlock = time_block || getCurrentTimeBlock();
  const userEnergy = energy_state?.current_level || "medium";

  const prioritized: PrioritizedAction[] = actions.map((action) => {
    // Calculate individual scores
    const urgency_score = URGENCY_SCORES[action.urgency];
    const importance_score = IMPORTANCE_SCORES[action.importance];
    const energy_match_score = calculateEnergyMatchScore(action.energy_required, userEnergy);
    const time_match_score = calculateTimeMatchScore(action.best_time_block, currentTimeBlock);
    const context_relevance_score = calculateContextRelevanceScore(action, focus_areas);

    // Calculate weighted priority score
    const priority_score = Math.round(
      urgency_score * WEIGHTS.urgency +
      importance_score * WEIGHTS.importance +
      energy_match_score * WEIGHTS.energy_match +
      time_match_score * WEIGHTS.time_match +
      context_relevance_score * WEIGHTS.context_relevance
    );

    return {
      ...action,
      priority_score,
      urgency_score,
      importance_score,
      energy_match_score,
      time_match_score,
      context_relevance_score,
    };
  });

  // Sort by priority score
  prioritized.sort((a, b) => b.priority_score - a.priority_score);

  // If time constraint, filter to what fits
  if (available_minutes) {
    let totalMinutes = 0;
    return prioritized.filter((action) => {
      if (totalMinutes + action.estimated_minutes <= available_minutes) {
        totalMinutes += action.estimated_minutes;
        return true;
      }
      return false;
    });
  }

  return prioritized;
}

// ============================================
// UPDATE STORED PRIORITIES
// ============================================

export async function updateStoredPriorities(
  userId: string,
  energy_state?: EnergyState,
  focus_areas?: string[]
): Promise<number> {
  const supabase = getSupabase();

  // Get all suggested actions
  const { data: actions } = await supabase
    .from("efc_generated_actions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "suggested");

  if (!actions?.length) return 0;

  // Re-prioritize
  const prioritized = prioritizeActions({
    actions,
    energy_state,
    focus_areas,
  });

  // Update scores in database
  for (const action of prioritized) {
    await supabase
      .from("efc_generated_actions")
      .update({ priority_score: action.priority_score })
      .eq("id", action.id);
  }

  return prioritized.length;
}

// ============================================
// GET TOP PRIORITIES
// ============================================

export async function getTopPriorities(
  userId: string,
  options: {
    limit?: number;
    energy_state?: EnergyState;
    available_minutes?: number;
    focus_areas?: string[];
  } = {}
): Promise<PrioritizedAction[]> {
  const supabase = getSupabase();

  const { data: actions } = await supabase
    .from("efc_generated_actions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "suggested")
    .order("priority_score", { ascending: false })
    .limit(options.limit || 20);

  if (!actions?.length) return [];

  // Re-score with current context
  return prioritizeActions({
    actions,
    energy_state: options.energy_state,
    available_minutes: options.available_minutes,
    focus_areas: options.focus_areas,
  });
}

// ============================================
// EISENHOWER MATRIX
// ============================================

export function categorizeByEisenhower(
  actions: PrioritizedAction[]
): {
  do_first: PrioritizedAction[];      // Urgent + Important
  schedule: PrioritizedAction[];       // Not Urgent + Important
  delegate: PrioritizedAction[];       // Urgent + Not Important
  eliminate: PrioritizedAction[];      // Not Urgent + Not Important
} {
  const result = {
    do_first: [] as PrioritizedAction[],
    schedule: [] as PrioritizedAction[],
    delegate: [] as PrioritizedAction[],
    eliminate: [] as PrioritizedAction[],
  };

  for (const action of actions) {
    const isUrgent = action.urgency === "immediate" || action.urgency === "today";
    const isImportant = action.importance === "critical" || action.importance === "high";

    if (isUrgent && isImportant) {
      result.do_first.push(action);
    } else if (!isUrgent && isImportant) {
      result.schedule.push(action);
    } else if (isUrgent && !isImportant) {
      result.delegate.push(action);
    } else {
      result.eliminate.push(action);
    }
  }

  return result;
}

// ============================================
// FOCUS MODE FILTER
// ============================================

export function filterForFocusMode(
  actions: PrioritizedAction[],
  focusDuration: number, // minutes
  energy: EnergyLevel
): PrioritizedAction[] {
  // Filter to actions that match energy and fit in focus block
  const suitable = actions.filter(
    (a) =>
      a.estimated_minutes <= focusDuration &&
      (a.energy_required === energy ||
        a.energy_required === "medium" ||
        energy === "high")
  );

  // Return best-fit sequence
  let totalTime = 0;
  const selected: PrioritizedAction[] = [];

  for (const action of suitable) {
    if (totalTime + action.estimated_minutes <= focusDuration) {
      selected.push(action);
      totalTime += action.estimated_minutes;
    }
  }

  return selected;
}

// ============================================
// EXPORTS
// ============================================

export const PriorityEngine = {
  prioritizeActions,
  updateStoredPriorities,
  getTopPriorities,
  categorizeByEisenhower,
  filterForFocusMode,
  calculateEnergyMatchScore,
  calculateTimeMatchScore,
};

export default PriorityEngine;