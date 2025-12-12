// Goals Agent - Manages Goal Synthesis, Tracking, and Goal-Aligned Actions
// lib/agi/agents/goalsAgent.ts

import { Agent, makeAgentResult } from "../agents";
import { AgentContext, AGIAction } from "../types";
import { synthesizeCandidateGoals } from "../goals/engine";
import { upsertAGIGoalsFromCandidates, getActiveGoals, getGoalProgress, logGoalProgress } from "../goals/store";
import { analyzeHorizon } from "../planning/horizon";
import { getAGIUserProfile } from "../settings";

export const goalsAgent: Agent = {
  name: "GoalsAgent",
  description: "Synthesizes goals from world state, tracks progress, and proposes goal-aligned actions.",
  priority: 80, // High priority - runs early

  async run(ctx: AgentContext) {
    const actions: AGIAction[] = [];
    const { world, trigger, userId } = ctx;

    // Only run goal synthesis during weekly rituals or manual runs
    const isWeeklyRitual = trigger.type === 'schedule_tick' && trigger.source === 'ritual/weekly';
    const isManual = trigger.type === 'manual';

    if (!isWeeklyRitual && !isManual) {
      // For other triggers, just check existing goals and propose actions
      const activeGoals = await getActiveGoals(userId);
      if (activeGoals.length === 0) {
        return makeAgentResult("GoalsAgent", "No active goals to track.", [], 0.3);
      }

      // Check progress on existing goals and propose next steps
      for (const goal of activeGoals.slice(0, 3)) { // Focus on top 3 goals
        const progress = await getGoalProgress(userId, goal.id);
        const recentProgress = progress[0];

        // If goal is lagging or no progress logged, suggest action
        if (!recentProgress || (recentProgress.progress !== null && recentProgress.progress < 0.3)) {
          actions.push({
            type: "create_task",
            label: `Take next step toward: ${goal.title}`,
            details: {
              title: `Goal action: ${goal.title}`,
              description: goal.description || `Work toward your goal: ${goal.title}`,
              when: "this_week",
              priority: 0.7,
              domain: goal.domain,
              subsource: "goals_agent",
              metadata: {
                goalId: goal.id,
                goalTitle: goal.title,
              },
            },
            requiresConfirmation: false,
            riskLevel: "low",
          });
        }
      }

      return makeAgentResult(
        "GoalsAgent",
        `Tracking ${activeGoals.length} active goal(s).`,
        actions,
        actions.length > 0 ? 0.7 : 0.4
      );
    }

    // Weekly ritual: full goal synthesis and review
    try {
      // 1. Compute horizon plan
      const horizon = analyzeHorizon(world);

      // 2. Load profile
      const profile = await getAGIUserProfile(userId);

      // 3. Synthesize candidate goals
      const candidateGoals = synthesizeCandidateGoals(world, horizon, profile);

      // 4. Upsert goals to database
      if (candidateGoals.length > 0) {
        await upsertAGIGoalsFromCandidates(userId, candidateGoals);

        // Log insights about new/updated goals
        actions.push({
          type: "log_insight",
          label: `${candidateGoals.length} goal(s) synthesized for strategic planning`,
          details: {
            insight: `Pulse has identified ${candidateGoals.length} strategic goal(s) based on your current patterns: ${candidateGoals.map(g => g.title).join(', ')}. These goals will guide your weekly planning.`,
            priority: "high",
            domain: "planning",
            subsource: "goals_agent/synthesis",
          },
          requiresConfirmation: false,
          riskLevel: "low",
        });
      }

      // 5. Load active goals and check progress
      const activeGoals = await getActiveGoals(userId);
      
      // 6. Compute progress for each goal and log it
      const progressUpdates: Array<{
        goalId: string;
        value?: number;
        progress?: number;
        note?: string;
      }> = [];

      for (const goal of activeGoals) {
        const config = goal.config || {};
        const metric = config.metric;

        let currentValue: number | undefined;
        let progress: number | undefined;
        let note: string | undefined;

        if (metric === 'task_rollover_reduction') {
          const overdueCount = world.time.overdueTasks.length;
          currentValue = overdueCount;
          const baseline = config.baseline || overdueCount;
          const target = config.target || 0;
          if (baseline > target) {
            progress = Math.max(0, Math.min(1, (baseline - currentValue) / (baseline - target)));
          }
          note = `${overdueCount} overdue tasks (target: ${target})`;
        } else if (metric === 'email_backlog_reduction') {
          const backlogCount = (world.email?.urgentThreads?.length || 0) + (world.email?.waitingOnUser?.length || 0);
          currentValue = backlogCount;
          const baseline = config.baseline || backlogCount;
          const target = config.target || 0;
          if (baseline > target) {
            progress = Math.max(0, Math.min(1, (baseline - currentValue) / (baseline - target)));
          }
          note = `${backlogCount} emails in backlog (target: ${target})`;
        } else if (metric === 'relationship_drift_reduction') {
          const drift = world.relationships.relationshipDrift || 0;
          currentValue = drift;
          const baseline = config.baseline || drift;
          const target = config.target || 0;
          if (baseline > target) {
            progress = Math.max(0, Math.min(1, (baseline - currentValue) / (baseline - target)));
          }
          note = `Drift score: ${(drift * 100).toFixed(0)}% (target: ${(target * 100).toFixed(0)}%)`;
        } else if (metric === 'financial_stress_reduction') {
          const stressCount = world.finances.stressSignals?.length || 0;
          currentValue = stressCount;
          const baseline = config.baseline || stressCount;
          const target = config.target || 0;
          if (baseline > target) {
            progress = Math.max(0, Math.min(1, (baseline - currentValue) / (baseline - target)));
          }
          note = `${stressCount} stress signals (target: ${target})`;
        }

        if (currentValue !== undefined) {
          progressUpdates.push({
            goalId: goal.id,
            value: currentValue,
            progress,
            note,
          });
        }
      }

      // Log progress updates
      if (progressUpdates.length > 0) {
        await logGoalProgress(userId, progressUpdates);
      }

      // 7. Propose actions for goals that need attention
      for (const goal of activeGoals.slice(0, 5)) {
        const progress = await getGoalProgress(userId, goal.id);
        const recentProgress = progress[0];

        // If goal is new or lagging, propose first steps
        if (!recentProgress || (recentProgress.progress !== null && recentProgress.progress < 0.3)) {
          actions.push({
            type: "create_task",
            label: `First step: ${goal.title}`,
            details: {
              title: `Goal: ${goal.title}`,
              description: goal.description || `Work toward: ${goal.title}`,
              when: "this_week",
              priority: 0.8,
              domain: goal.domain,
              subsource: "goals_agent/weekly_review",
              metadata: {
                goalId: goal.id,
                goalTitle: goal.title,
              },
            },
            requiresConfirmation: false,
            riskLevel: "low",
          });
        }
      }

      const reasoning = candidateGoals.length > 0
        ? `Synthesized ${candidateGoals.length} new/updated goal(s) and tracked progress on ${activeGoals.length} active goal(s).`
        : `Tracked progress on ${activeGoals.length} active goal(s).`;

      const confidence = candidateGoals.length > 0 ? 0.9 : activeGoals.length > 0 ? 0.7 : 0.4;

      return makeAgentResult("GoalsAgent", reasoning, actions, confidence);
    } catch (err: any) {
      console.error("[AGI][GoalsAgent] Error:", err);
      return makeAgentResult(
        "GoalsAgent",
        `Goal synthesis failed: ${err.message}`,
        [],
        0.2
      );
    }
  },
};


