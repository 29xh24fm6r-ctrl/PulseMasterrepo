// AGI Kernel Loop
// lib/agi/kernel.ts

import { buildWorldState } from "./worldstate";
import { getRegisteredAgents } from "./registry";
import { planFromAgentResults } from "./planner";
import {
  AGIUserId,
  AGITriggerContext,
  AGIRunResult,
  WorldState,
  AgentResult,
  AGIAction,
} from "./types";
import { AGIUserProfile } from "./settings";
import { analyzeHorizon } from "./planning/horizon";
import { buildWeeklyReviewSummary } from "./review/weekly";
import { generateWeeklyNarrative } from "./narrative/strategic";
import { getActiveGoals, getGoalProgress } from "./goals/store";

export interface KernelOptions {
  worldStateOverride?: WorldState; // For testing - use synthetic worldstate
  profile?: AGIUserProfile; // User personalization profile
}

export async function runAGIKernel(
  userId: AGIUserId,
  trigger: AGITriggerContext,
  opts?: KernelOptions
): Promise<AGIRunResult> {
  const startedAt = new Date().toISOString();

  // Use override worldstate for testing, or build real one
  const world: WorldState = opts?.worldStateOverride || (await buildWorldState(userId));
  
  if (world.meta.agiLevel === "off") {
    // Return error result - AGI is disabled
    throw new Error("AGI is disabled for this user. Please enable it in settings.");
  }

  const agents = getRegisteredAgents();

  if (process.env.NODE_ENV === "development") {
    console.log(`[AGI Kernel] Running ${agents.length} agents...`);
  }

  // Add trigger to world state for agents/planner to access
  (world as any).trigger = trigger;

  const agentResults: AgentResult[] = [];
  for (const agent of agents) {
    try {
      const result = await agent.run({ userId, world, trigger });
      agentResults.push(result);

      if (process.env.NODE_ENV === "development") {
        console.log(
          `[AGI Kernel][${agent.name}] ${result.proposedActions.length} action(s), confidence: ${result.confidence.toFixed(2)}, reasoning: ${result.reasoningSummary.substring(0, 80)}...`
        );
      }
    } catch (err) {
      console.error(`[AGI Kernel] Agent ${agent.name} failed:`, err);
      // Continue; fault tolerance is important
    }
  }

  if (process.env.NODE_ENV === "development") {
    const totalActions = agentResults.reduce((sum, r) => sum + r.proposedActions.length, 0);
    console.log(`[AGI Kernel] Total actions proposed: ${totalActions}`);
  }

  const maxActions = 10;
  const finalPlan: AGIAction[] = planFromAgentResults(world, agentResults, {
    maxActions,
    profile: opts?.profile,
  });

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[AGI Kernel][Planner] Selected ${finalPlan.length} action(s) from ${agentResults.reduce((sum, r) => sum + r.proposedActions.length, 0)} proposed`
    );
    console.log(
      `[AGI Kernel][Planner] Final plan:`,
      finalPlan.map((a) => ({
        type: a.type,
        label: a.label.substring(0, 50),
        riskLevel: a.riskLevel,
        requiresConfirmation: a.requiresConfirmation,
      }))
    );
  }

  const finishedAt = new Date().toISOString();

  const runResult: AGIRunResult = {
    runId: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    userId,
    startedAt,
    finishedAt,
    trigger,
    worldSnapshot: world,
    agentResults,
    finalPlan,
  };

  // For weekly rituals, add horizon planning and weekly review
  const isWeeklyRitual = trigger.type === 'schedule_tick' && trigger.source === 'ritual/weekly';
  if (isWeeklyRitual) {
    try {
      // 1. Compute horizon plan
      const horizon = analyzeHorizon(world);

      // 2. Load goals and progress
      const activeGoals = await getActiveGoals(userId);
      const goalProgress = await getGoalProgress(userId);

      // 3. Build weekly review summary
      const weeklyReview = buildWeeklyReviewSummary(world, horizon, activeGoals, goalProgress);
      runResult.weeklyReviewSummary = weeklyReview;

      // 4. Generate narrative (optional - may fail if LLM unavailable)
      try {
        const narrative = await generateWeeklyNarrative(userId, world, weeklyReview, horizon);
        runResult.weeklyReviewSummaryNarrative = narrative;
      } catch (narrativeErr: any) {
        console.warn('[AGI Kernel] Failed to generate weekly narrative:', narrativeErr.message);
        // Continue without narrative - it's optional
      }

      if (process.env.NODE_ENV === "development") {
        console.log(`[AGI Kernel] Weekly review generated: ${weeklyReview.highlights.length} highlights, ${weeklyReview.lowlights.length} lowlights, ${weeklyReview.goalUpdates.length} goal updates`);
      }
    } catch (err: any) {
      console.error('[AGI Kernel] Error building weekly review:', err);
      // Don't fail the entire run if weekly review fails
    }
  }

  return runResult;
}

