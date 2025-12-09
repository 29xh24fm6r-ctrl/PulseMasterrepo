// Executive Function Cortex - Main Index
// The action layer that turns knowledge into sequenced, energy-matched actions

export * from "./types";
export { ActionGenerator } from "./action-generator";
export { PriorityEngine } from "./priority-engine";
export { ActionSequencer } from "./action-sequencer";
export { EnergyMatcher } from "./energy-matcher";
export { FollowThroughTracker } from "./follow-through-tracker";

// ============================================
// UNIFIED EFC INTERFACE
// ============================================

import { ActionGenerator } from "./action-generator";
import { PriorityEngine } from "./priority-engine";
import { ActionSequencer } from "./action-sequencer";
import { EnergyMatcher } from "./energy-matcher";
import { FollowThroughTracker } from "./follow-through-tracker";
import {
  GeneratedAction,
  PrioritizedAction,
  ActionSequence,
  EnergyState,
  Commitment,
  FollowThroughNudge,
} from "./types";

export interface DailyBriefing {
  energy_state: EnergyState;
  top_priorities: PrioritizedAction[];
  recommended_sequence: ActionSequence;
  active_commitments: Commitment[];
  pending_nudges: FollowThroughNudge[];
  follow_through_score: number;
}

export interface ExecutiveFunctionCortex {
  // Generate and prioritize actions
  generateActions: typeof ActionGenerator.generateActions;
  prioritizeActions: typeof PriorityEngine.prioritizeActions;
  getTopPriorities: typeof PriorityEngine.getTopPriorities;
  
  // Sequencing
  generateDailySequence: typeof ActionSequencer.generateDailySequence;
  generateFocusBlockSequence: typeof ActionSequencer.generateFocusBlockSequence;
  
  // Energy
  recordEnergyState: typeof EnergyMatcher.recordEnergyState;
  getCurrentEnergyState: typeof EnergyMatcher.getCurrentEnergyState;
  getEnergyMatchedRecommendations: typeof EnergyMatcher.getEnergyMatchedRecommendations;
  
  // Follow-through
  createCommitment: typeof FollowThroughTracker.createCommitment;
  updateCommitmentProgress: typeof FollowThroughTracker.updateCommitmentProgress;
  getActiveNudges: typeof FollowThroughTracker.getActiveNudges;
  
  // High-level
  getDailyBriefing: (userId: string) => Promise<DailyBriefing>;
  processUserIntent: (userId: string, intent: string) => Promise<any>;
}

// ============================================
// HIGH-LEVEL FUNCTIONS
// ============================================

async function getDailyBriefing(userId: string): Promise<DailyBriefing> {
  // Get energy state
  const energy_state = await EnergyMatcher.getCurrentEnergyState(userId) || {
    current_level: "medium" as const,
    trend: "stable" as const,
    last_check_in: new Date().toISOString(),
    factors: {},
    optimal_task_types: [],
    avoid_task_types: [],
  };

  // Generate fresh actions
  const actions = await ActionGenerator.generateActions(userId, {
    include_calendar: true,
    include_tasks: true,
    include_commitments: true,
    time_horizon: "today",
    max_actions: 8,
  });

  // Store them
  await ActionGenerator.storeGeneratedActions(userId, actions);

  // Get prioritized
  const top_priorities = await PriorityEngine.getTopPriorities(userId, {
    energy_state,
    limit: 10,
  });

  // Generate sequence
  const recommended_sequence = ActionSequencer.generateDailySequence(top_priorities, {
    startEnergy: energy_state.current_level,
    workHours: 8,
    includeBreaks: true,
  });
  recommended_sequence.user_id = userId;

  // Get commitments
  const active_commitments = await FollowThroughTracker.getActiveCommitments(userId, {
    limit: 10,
  });

  // Generate and get nudges
  await FollowThroughTracker.generateNudgesForUser(userId);
  const pending_nudges = await FollowThroughTracker.getActiveNudges(userId);

  // Get follow-through score
  const ftScore = await FollowThroughTracker.calculateFollowThroughScore(userId);

  return {
    energy_state,
    top_priorities,
    recommended_sequence,
    active_commitments,
    pending_nudges,
    follow_through_score: ftScore.score,
  };
}

async function processUserIntent(
  userId: string,
  intent: string
): Promise<{
  understood: string;
  actions_generated: GeneratedAction[];
  commitments_found: Partial<Commitment>[];
  next_steps: string[];
}> {
  // Extract any commitments from the intent
  const commitments_found = await FollowThroughTracker.extractCommitmentsFromText(userId, intent);

  // Create commitments if found
  for (const c of commitments_found) {
    if (c.title) {
      await FollowThroughTracker.createCommitment(userId, c as any);
    }
  }

  // Generate actions based on intent
  const actions_generated = await ActionGenerator.generateActions(userId, {
    context_query: intent,
    max_actions: 5,
    time_horizon: "today",
  });

  await ActionGenerator.storeGeneratedActions(userId, actions_generated);

  // Determine next steps
  const next_steps: string[] = [];

  if (commitments_found.length > 0) {
    next_steps.push(`Created ${commitments_found.length} commitment(s) to track`);
  }

  if (actions_generated.length > 0) {
    next_steps.push(`Generated ${actions_generated.length} recommended action(s)`);
    const topAction = actions_generated[0];
    if (topAction) {
      next_steps.push(`Top recommendation: ${topAction.title}`);
    }
  }

  return {
    understood: `Processed intent: "${intent.substring(0, 100)}..."`,
    actions_generated,
    commitments_found,
    next_steps,
  };
}

// ============================================
// EXPORT UNIFIED INTERFACE
// ============================================

export const EFC: ExecutiveFunctionCortex = {
  // Action Generation
  generateActions: ActionGenerator.generateActions,
  prioritizeActions: PriorityEngine.prioritizeActions,
  getTopPriorities: PriorityEngine.getTopPriorities,
  
  // Sequencing
  generateDailySequence: ActionSequencer.generateDailySequence,
  generateFocusBlockSequence: ActionSequencer.generateFocusBlockSequence,
  
  // Energy
  recordEnergyState: EnergyMatcher.recordEnergyState,
  getCurrentEnergyState: EnergyMatcher.getCurrentEnergyState,
  getEnergyMatchedRecommendations: EnergyMatcher.getEnergyMatchedRecommendations,
  
  // Follow-through
  createCommitment: FollowThroughTracker.createCommitment,
  updateCommitmentProgress: FollowThroughTracker.updateCommitmentProgress,
  getActiveNudges: FollowThroughTracker.getActiveNudges,
  
  // High-level
  getDailyBriefing,
  processUserIntent,
};

export default EFC;