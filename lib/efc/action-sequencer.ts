// Executive Function Cortex: Action Sequencer
// Orders actions into optimal execution sequence

import { createClient } from "@supabase/supabase-js";
import {
  PrioritizedAction,
  ActionSequence,
  EnergyLevel,
  SequenceInput,
} from "./types";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================
// ENERGY FLOW PATTERNS
// ============================================

const ENERGY_TRANSITIONS: Record<EnergyLevel, EnergyLevel[]> = {
  high: ["high", "medium", "low"],
  medium: ["medium", "high", "medium", "low"],
  low: ["low", "medium", "recovery"],
  recovery: ["recovery", "low"],
};

// Optimal task energy for different scenarios
const ENERGY_TASK_FIT: Record<EnergyLevel, string[]> = {
  high: ["decision", "meeting", "communication", "research"],
  medium: ["task", "follow_up", "admin"],
  low: ["reflection", "habit"],
  recovery: ["health", "reflection"],
};

// ============================================
// DEPENDENCY RESOLUTION
// ============================================

function topologicalSort(actions: PrioritizedAction[]): PrioritizedAction[] {
  const actionMap = new Map(actions.map((a) => [a.id, a]));
  const visited = new Set<string>();
  const result: PrioritizedAction[] = [];

  function visit(action: PrioritizedAction) {
    if (visited.has(action.id)) return;
    visited.add(action.id);

    // Visit dependencies first
    for (const depId of action.dependencies || []) {
      const dep = actionMap.get(depId);
      if (dep && !visited.has(depId)) {
        visit(dep);
      }
    }

    result.push(action);
  }

  // Start with highest priority actions
  const sorted = [...actions].sort((a, b) => b.priority_score - a.priority_score);
  for (const action of sorted) {
    visit(action);
  }

  return result;
}

// ============================================
// ENERGY-AWARE SEQUENCING
// ============================================

function sequenceByEnergy(
  actions: PrioritizedAction[],
  startEnergy: EnergyLevel
): PrioritizedAction[] {
  const result: PrioritizedAction[] = [];
  const remaining = [...actions];
  let currentEnergy = startEnergy;

  while (remaining.length > 0) {
    // Find best action for current energy
    const bestIdx = findBestActionForEnergy(remaining, currentEnergy);
    
    if (bestIdx === -1) {
      // If no good match, just take highest priority
      const [action] = remaining.splice(0, 1);
      result.push(action);
    } else {
      const [action] = remaining.splice(bestIdx, 1);
      result.push(action);
    }

    // Update energy based on task
    currentEnergy = predictEnergyAfterTask(
      currentEnergy,
      result[result.length - 1]
    );
  }

  return result;
}

function findBestActionForEnergy(
  actions: PrioritizedAction[],
  energy: EnergyLevel
): number {
  let bestIdx = -1;
  let bestScore = -1;

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    
    // Calculate energy fit score
    let score = action.priority_score;
    
    // Bonus if energy matches
    if (action.energy_required === energy) {
      score += 30;
    } else if (
      (energy === "high" && action.energy_required === "medium") ||
      (energy === "medium" && action.energy_required === "low") ||
      (energy === "low" && action.energy_required === "recovery")
    ) {
      score += 15;
    }

    // Bonus if action type fits energy
    const goodTypes = ENERGY_TASK_FIT[energy] || [];
    if (goodTypes.includes(action.action_type)) {
      score += 20;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestIdx;
}

function predictEnergyAfterTask(
  currentEnergy: EnergyLevel,
  action: PrioritizedAction
): EnergyLevel {
  // High-energy tasks drain energy
  if (action.energy_required === "high") {
    if (currentEnergy === "high") return "medium";
    if (currentEnergy === "medium") return "low";
    return "recovery";
  }

  // Recovery tasks restore energy
  if (action.energy_required === "recovery" || action.action_type === "health") {
    if (currentEnergy === "recovery") return "low";
    if (currentEnergy === "low") return "medium";
    return currentEnergy;
  }

  // Medium tasks have small drain
  if (action.estimated_minutes > 60) {
    if (currentEnergy === "high") return "medium";
    if (currentEnergy === "medium") return "low";
  }

  return currentEnergy;
}

// ============================================
// TIME-BOXED SEQUENCING
// ============================================

function sequenceForTimeBox(
  actions: PrioritizedAction[],
  availableMinutes: number,
  startEnergy: EnergyLevel
): PrioritizedAction[] {
  const sorted = sequenceByEnergy(actions, startEnergy);
  const result: PrioritizedAction[] = [];
  let totalMinutes = 0;

  for (const action of sorted) {
    if (totalMinutes + action.estimated_minutes <= availableMinutes) {
      result.push(action);
      totalMinutes += action.estimated_minutes;
    }
    
    // Stop if we've filled the time box
    if (totalMinutes >= availableMinutes * 0.9) break;
  }

  return result;
}

// ============================================
// DAILY SEQUENCE GENERATION
// ============================================

export function generateDailySequence(
  actions: PrioritizedAction[],
  options: {
    startEnergy: EnergyLevel;
    workHours: number;
    includeBreaks: boolean;
  }
): ActionSequence {
  const { startEnergy, workHours, includeBreaks } = options;
  const availableMinutes = workHours * 60;

  // Resolve dependencies first
  const ordered = topologicalSort(actions);

  // Sequence by energy
  const sequenced = sequenceForTimeBox(ordered, availableMinutes, startEnergy);

  // Calculate energy flow
  const energyFlow: EnergyLevel[] = [startEnergy];
  let currentEnergy = startEnergy;
  for (const action of sequenced) {
    currentEnergy = predictEnergyAfterTask(currentEnergy, action);
    energyFlow.push(currentEnergy);
  }

  const totalMinutes = sequenced.reduce((sum, a) => sum + a.estimated_minutes, 0);

  return {
    id: crypto.randomUUID(),
    user_id: "", // Set by caller
    sequence_type: "daily",
    title: `Daily Plan - ${new Date().toLocaleDateString()}`,
    actions: sequenced,
    total_minutes: totalMinutes,
    energy_flow: energyFlow,
    created_at: new Date().toISOString(),
    valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

// ============================================
// FOCUS BLOCK SEQUENCE
// ============================================

export function generateFocusBlockSequence(
  actions: PrioritizedAction[],
  options: {
    durationMinutes: number;
    energy: EnergyLevel;
    focusArea?: string;
  }
): ActionSequence {
  const { durationMinutes, energy, focusArea } = options;

  // Filter to focus-appropriate actions
  let filtered = actions.filter(
    (a) =>
      a.estimated_minutes <= durationMinutes &&
      (a.energy_required === energy ||
        a.energy_required === "medium" ||
        energy === "high")
  );

  // Prioritize focus area if specified
  if (focusArea) {
    filtered.sort((a, b) => {
      const aMatches = `${a.title} ${a.reasoning}`.toLowerCase().includes(focusArea.toLowerCase());
      const bMatches = `${b.title} ${b.reasoning}`.toLowerCase().includes(focusArea.toLowerCase());
      if (aMatches && !bMatches) return -1;
      if (bMatches && !aMatches) return 1;
      return b.priority_score - a.priority_score;
    });
  }

  // Fill the focus block
  const sequenced = sequenceForTimeBox(filtered, durationMinutes, energy);
  const totalMinutes = sequenced.reduce((sum, a) => sum + a.estimated_minutes, 0);

  return {
    id: crypto.randomUUID(),
    user_id: "",
    sequence_type: "focus_block",
    title: `Focus Block: ${focusArea || "Deep Work"}`,
    actions: sequenced,
    total_minutes: totalMinutes,
    energy_flow: [energy],
    created_at: new Date().toISOString(),
    valid_until: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
  };
}

// ============================================
// STORE SEQUENCE
// ============================================

export async function storeSequence(
  userId: string,
  sequence: ActionSequence
): Promise<string> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("efc_action_sequences")
    .insert({
      id: sequence.id,
      user_id: userId,
      sequence_type: sequence.sequence_type,
      title: sequence.title,
      action_ids: sequence.actions.map((a) => a.id),
      total_minutes: sequence.total_minutes,
      energy_flow: sequence.energy_flow,
      valid_until: sequence.valid_until,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

// ============================================
// GET ACTIVE SEQUENCE
// ============================================

export async function getActiveSequence(
  userId: string
): Promise<ActionSequence | null> {
  const supabase = getSupabase();

  const { data: sequence } = await supabase
    .from("efc_action_sequences")
    .select("*")
    .eq("user_id", userId)
    .eq("completed", false)
    .gt("valid_until", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!sequence) return null;

  // Fetch full actions
  const { data: actions } = await supabase
    .from("efc_generated_actions")
    .select("*")
    .in("id", sequence.action_ids);

  return {
    ...sequence,
    actions: actions || [],
  };
}

// ============================================
// EXPORTS
// ============================================

export const ActionSequencer = {
  generateDailySequence,
  generateFocusBlockSequence,
  storeSequence,
  getActiveSequence,
  topologicalSort,
  sequenceByEnergy,
};

export default ActionSequencer;