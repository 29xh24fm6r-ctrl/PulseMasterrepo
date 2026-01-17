// Executive Function Cortex: Energy Matcher
// Tracks user energy and matches tasks to current state

import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { getOpenAI } from "@/services/ai/openai";
import {
  EnergyState,
  EnergyLevel,
  ActionType,
  PrioritizedAction,
} from "./types";



function getSupabase() {
  return getSupabaseAdminRuntimeClient();
}

// ============================================
// ENERGY LEVEL CHARACTERISTICS
// ============================================

const ENERGY_PROFILES: Record<
  EnergyLevel,
  {
    optimal_tasks: ActionType[];
    avoid_tasks: ActionType[];
    max_task_duration: number;
    description: string;
  }
> = {
  high: {
    optimal_tasks: ["decision", "meeting", "communication", "research"],
    avoid_tasks: ["admin"],
    max_task_duration: 120,
    description: "Peak performance - tackle complex, high-stakes work",
  },
  medium: {
    optimal_tasks: ["task", "follow_up", "admin", "communication"],
    avoid_tasks: ["decision"],
    max_task_duration: 90,
    description: "Steady state - good for routine tasks and communication",
  },
  low: {
    optimal_tasks: ["reflection", "habit", "admin"],
    avoid_tasks: ["decision", "meeting", "research"],
    max_task_duration: 45,
    description: "Conservation mode - simple tasks and planning",
  },
  recovery: {
    optimal_tasks: ["health", "reflection"],
    avoid_tasks: ["decision", "meeting", "communication", "research", "task"],
    max_task_duration: 30,
    description: "Recharge time - rest and light activities only",
  },
};

// ============================================
// RECORD ENERGY STATE
// ============================================

export async function recordEnergyState(
  userId: string,
  state: {
    energy_level: EnergyLevel;
    trend?: "rising" | "stable" | "falling";
    factors?: EnergyState["factors"];
    notes?: string;
  }
): Promise<EnergyState> {
  const supabase = getSupabase();
  const profile = ENERGY_PROFILES[state.energy_level];

  const energyState: EnergyState = {
    current_level: state.energy_level,
    trend: state.trend || "stable",
    last_check_in: new Date().toISOString(),
    factors: state.factors || {},
    optimal_task_types: profile.optimal_tasks,
    avoid_task_types: profile.avoid_tasks,
  };

  await supabase.from("efc_energy_states").insert({
    user_id: userId,
    energy_level: state.energy_level,
    trend: state.trend,
    factors: state.factors || {},
    optimal_task_types: profile.optimal_tasks,
    avoid_task_types: profile.avoid_tasks,
    notes: state.notes,
  });

  return energyState;
}

// ============================================
// GET CURRENT ENERGY STATE
// ============================================

export async function getCurrentEnergyState(
  userId: string
): Promise<EnergyState | null> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from("efc_energy_states")
    .select("*")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  // Check if state is recent (within 4 hours)
  const recordedAt = new Date(data.recorded_at);
  const hoursSince = (Date.now() - recordedAt.getTime()) / (1000 * 60 * 60);

  if (hoursSince > 4) {
    // State is stale, estimate based on time of day
    return estimateEnergyState(userId);
  }

  return {
    current_level: data.energy_level,
    trend: data.trend || "stable",
    last_check_in: data.recorded_at,
    factors: data.factors || {},
    optimal_task_types: data.optimal_task_types || [],
    avoid_task_types: data.avoid_task_types || [],
  };
}

// ============================================
// ESTIMATE ENERGY STATE
// ============================================

async function estimateEnergyState(userId: string): Promise<EnergyState> {
  const supabase = getSupabase();
  const hour = new Date().getHours();

  // Base estimation on time of day
  let estimatedLevel: EnergyLevel;
  if (hour >= 9 && hour < 12) {
    estimatedLevel = "high"; // Morning peak
  } else if (hour >= 12 && hour < 14) {
    estimatedLevel = "medium"; // Post-lunch dip
  } else if (hour >= 14 && hour < 17) {
    estimatedLevel = "medium"; // Afternoon
  } else if (hour >= 17 && hour < 20) {
    estimatedLevel = "low"; // Evening wind-down
  } else {
    estimatedLevel = "recovery"; // Night
  }

  // Adjust based on historical patterns
  const dayOfWeek = new Date().getDay();
  const { data: historicalStates } = await supabase
    .from("efc_energy_states")
    .select("energy_level")
    .eq("user_id", userId)
    .gte("recorded_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order("recorded_at", { ascending: false })
    .limit(20);

  if (historicalStates?.length) {
    // Calculate most common energy level at this time
    const counts: Record<string, number> = {};
    for (const state of historicalStates) {
      counts[state.energy_level] = (counts[state.energy_level] || 0) + 1;
    }

    // If historical data strongly suggests different level, use that
    const mostCommon = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (mostCommon && mostCommon[1] > historicalStates.length * 0.5) {
      estimatedLevel = mostCommon[0] as EnergyLevel;
    }
  }

  const profile = ENERGY_PROFILES[estimatedLevel];

  return {
    current_level: estimatedLevel,
    trend: "stable",
    last_check_in: new Date().toISOString(),
    factors: {},
    optimal_task_types: profile.optimal_tasks,
    avoid_task_types: profile.avoid_tasks,
  };
}

// ============================================
// MATCH TASKS TO ENERGY
// ============================================

export function matchTasksToEnergy(
  actions: PrioritizedAction[],
  energyState: EnergyState
): {
  recommended: PrioritizedAction[];
  possible: PrioritizedAction[];
  avoid: PrioritizedAction[];
} {
  const recommended: PrioritizedAction[] = [];
  const possible: PrioritizedAction[] = [];
  const avoid: PrioritizedAction[] = [];

  const profile = ENERGY_PROFILES[energyState.current_level];

  for (const action of actions) {
    // Check if action type is optimal for energy
    if (energyState.optimal_task_types.includes(action.action_type)) {
      recommended.push(action);
    }
    // Check if should avoid
    else if (energyState.avoid_task_types.includes(action.action_type)) {
      avoid.push(action);
    }
    // Check duration constraint
    else if (action.estimated_minutes > profile.max_task_duration) {
      avoid.push(action);
    }
    // Everything else is possible
    else {
      possible.push(action);
    }
  }

  // Sort each category by priority
  recommended.sort((a, b) => b.priority_score - a.priority_score);
  possible.sort((a, b) => b.priority_score - a.priority_score);
  avoid.sort((a, b) => b.priority_score - a.priority_score);

  return { recommended, possible, avoid };
}

// ============================================
// ENERGY CHECK-IN PROMPT
// ============================================

export async function generateEnergyCheckInPrompt(
  userId: string
): Promise<{
  question: string;
  options: Array<{ level: EnergyLevel; label: string; emoji: string }>;
}> {
  const hour = new Date().getHours();
  let timeContext = "";

  if (hour < 10) {
    timeContext = "Good morning! Starting your day,";
  } else if (hour < 14) {
    timeContext = "Midday check-in:";
  } else if (hour < 18) {
    timeContext = "Afternoon check:";
  } else {
    timeContext = "Evening wrap-up:";
  }

  return {
    question: `${timeContext} How's your energy right now?`,
    options: [
      { level: "high", label: "Energized & focused", emoji: "⚡" },
      { level: "medium", label: "Steady & capable", emoji: "✨" },
      { level: "low", label: "Running low", emoji: "🔋" },
      { level: "recovery", label: "Need to recharge", emoji: "😴" },
    ],
  };
}

// ============================================
// PREDICT ENERGY IMPACT
// ============================================

export function predictEnergyImpact(
  currentEnergy: EnergyLevel,
  action: PrioritizedAction
): {
  predicted_energy: EnergyLevel;
  drain: number; // 0-100
  recommendation: string;
} {
  let drain = 0;
  let predicted: EnergyLevel = currentEnergy;

  // High-energy tasks drain more
  if (action.energy_required === "high") {
    drain = 40 + Math.floor(action.estimated_minutes / 3);
  } else if (action.energy_required === "medium") {
    drain = 20 + Math.floor(action.estimated_minutes / 5);
  } else if (action.energy_required === "low") {
    drain = 10 + Math.floor(action.estimated_minutes / 10);
  } else {
    drain = -20; // Recovery tasks restore energy
  }

  // Mismatch increases drain
  if (
    currentEnergy === "low" &&
    action.energy_required === "high"
  ) {
    drain += 30;
  }

  // Cap drain
  drain = Math.min(100, Math.max(-50, drain));

  // Predict resulting energy
  if (drain > 50) {
    predicted = currentEnergy === "high" ? "medium" : currentEnergy === "medium" ? "low" : "recovery";
  } else if (drain < 0) {
    predicted = currentEnergy === "recovery" ? "low" : currentEnergy === "low" ? "medium" : "high";
  }

  // Generate recommendation
  let recommendation: string;
  if (drain > 60) {
    recommendation = "This task may be draining - consider breaking it up or tackling when energy is higher.";
  } else if (drain > 30 && currentEnergy !== "high") {
    recommendation = "Doable, but you might want a quick break after.";
  } else if (drain < 0) {
    recommendation = "Good choice! This should help restore your energy.";
  } else {
    recommendation = "Good fit for your current energy level.";
  }

  return { predicted_energy: predicted, drain, recommendation };
}

// ============================================
// GET ENERGY-MATCHED RECOMMENDATIONS
// ============================================

export async function getEnergyMatchedRecommendations(
  userId: string,
  actions: PrioritizedAction[],
  count: number = 5
): Promise<{
  energy_state: EnergyState;
  recommendations: PrioritizedAction[];
  explanation: string;
}> {
  const energyState = await getCurrentEnergyState(userId) || await estimateEnergyState(userId);
  const matched = matchTasksToEnergy(actions, energyState);

  // Combine recommended + some possible
  const recommendations = [
    ...matched.recommended.slice(0, Math.ceil(count * 0.7)),
    ...matched.possible.slice(0, Math.floor(count * 0.3)),
  ].slice(0, count);

  const profile = ENERGY_PROFILES[energyState.current_level];
  const openai = await getOpenAI();

  const explanation = `${profile.description}. Best for: ${profile.optimal_tasks.join(", ")}.`;

  const prompt = `Given the user's current energy state, suggest 3 specific tasks aligned with: ${profile.optimal_tasks.join(", ")}.
Return JSON: {"tasks":[{"title":"...","duration_minutes":15,"difficulty":"low|med|high"}],"why":"..."}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return {
    energy_state: energyState,
    recommendations,
    explanation,
  };
}

// ============================================
// EXPORTS
// ============================================

export const EnergyMatcher = {
  recordEnergyState,
  getCurrentEnergyState,
  estimateEnergyState,
  matchTasksToEnergy,
  generateEnergyCheckInPrompt,
  predictEnergyImpact,
  getEnergyMatchedRecommendations,
};

export default EnergyMatcher;