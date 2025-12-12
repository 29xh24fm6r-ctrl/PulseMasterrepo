// Pulse Brainstem - Life Loop & Health
// lib/brain/brainstem.ts

import { ensureBrainSubsystemsForUser } from './registry';
import { updateSubsystemStatusForUser } from './registry/status';
import { logBrainErrorEvent } from './registry/errors';
import { computeBrainHealthSnapshotForUser } from './registry/health';
import { generateBrainDiagnosticsForUser } from './registry/diagnostics';
import { refreshDailyWorkSignalsForUser } from '@/lib/cortex/signals';
import { refreshWorkPatternsForUser } from '@/lib/cortex/patterns';
import { refreshWorkSkillsForUser } from '@/lib/cortex/skills';
import { detectWorkAnomaliesForUser, refreshWorkPredictionsForUser } from '@/lib/cortex/predict';
import { buildDailyWorkspaceForUser } from '@/lib/workspace/engine';
import { refreshDailyEmotionStateForUser } from '@/lib/emotion/engine';
import { refreshDailySomaticStateForUser } from '@/lib/somatic/engine';
import { runWeeklyNarrativeLoopForUser } from '@/lib/narrative/weekly';
import { refreshLifeCanonForUser } from '@/lib/life_canon/v1/canon_updater';
import { refreshDesireProfilesForUser } from '@/lib/desire/engine';
import { refreshSelfBehaviorPredictionsForUser } from '@/lib/behavior/self';
import { refreshContactBehaviorPredictionsForUser } from '@/lib/behavior/contacts';
import { refreshMindModelsForUser } from '@/lib/mind/engine';
import { refreshSocialNodesForUser } from '@/lib/social/nodes';
import { refreshSocialEdgesForUser } from '@/lib/social/edges';
import { refreshSocialInsightsForUser } from '@/lib/social/insights';
import { refreshValueProfileForUser } from '@/lib/ethics/value_profile';
import { refreshWisdomLessonsForUser } from '@/lib/wisdom/aggregator';
import { rebuildHeuristicsFromLessons } from '@/lib/wisdom/lessons';
import { refreshWisdomPlaybooksForUser } from '@/lib/wisdom/playbooks';
import { buildDailyWorkspaceV2ForUser } from '@/lib/workspace/v2/engine';
import { generateDailyInnerMonologue } from '@/lib/monologue/engine';
import { generateConsciousInsightsFromMonologue } from '@/lib/monologue/insights';
import { computeSomaticDailyMetricsForUser } from '@/lib/somatic/v2/daily_aggregator';
import { refreshSomaticAlertsForUser } from '@/lib/somatic/v2/alerts';
import { refreshSomaticPatternsForUser } from '@/lib/somatic/v2/patterns';
import { runMultiTimelineSimulationForUser } from '@/lib/simulation/v2/engine';
import { linkWorkspaceThreadsToTimelinesForDate } from '@/lib/simulation/v2/workspace_layer';
import { refreshTimelinePreferenceProfileForUser } from '@/lib/timeline_coach/preferences';
import { proposeTimelineDecisionForUser } from '@/lib/timeline_coach/coach';
import { saveTimelineDecisionForUser } from '@/lib/timeline_coach/commitments';
import { refreshDestinyBlueprintsForUser } from '@/lib/destiny/blueprints';
import { refreshCurrentDestinyArcForUser } from '@/lib/destiny/arcs';
import { evaluateDestinyAlignmentForUser } from '@/lib/destiny/alignment';
import { refreshSocialStateSnapshotForUser } from '@/lib/social/v2/snapshot';
import { refreshSocialRisksAndRecommendationsForUser } from '@/lib/social/v2/recommendations';
import { refreshTheoryOfMindProfileForEntity } from '@/lib/tom/profiles';
import { refreshEmotionStyleProfileForUser } from '@/lib/emotion/resonance/profile';
import { deriveResonanceEventsForUser } from '@/lib/emotion/resonance/resonance_learning';
import { refreshCultureProfileForContext } from '@/lib/culture/profiles';
import { evaluateCultureAlignmentForContext } from '@/lib/culture/alignment';
import { refreshCreativePatternsForUser } from '@/lib/creative/v2/patterns';
import { createSelfMirrorSnapshotForUser } from '@/lib/self_mirror/snapshot';
import { createSelfMirrorDeltaForUser } from '@/lib/self_mirror/delta';
import { createSelfMirrorHighlightsForUser } from '@/lib/self_mirror/highlights';
import { buildConsciousFrameForUser } from '@/lib/conscious_workspace/v3/builder';
import { selectFocusItemsForFrame } from '@/lib/conscious_workspace/v3/attention';
import { detectConflictsForFrame } from '@/lib/conscious_workspace/v3/conflicts';
import { runInnerMonologueForFrame } from '@/lib/conscious_workspace/v3/monologue';
import { collectPlanningContext } from '@/lib/meta_planner/constraints';
import { runMetaPlannerForUser } from '@/lib/meta_planner/engine';
import { applyPlanningDecisionsForSession } from '@/lib/meta_planner/apply';
import { getDueTriggersForUser } from '@/lib/cerebellum/triggers';
import { runMotorRoutine } from '@/lib/cerebellum/executor';
import { startOfToday, endOfToday } from 'date-fns';

/**
 * Run daily brain loop for a user
 * This is the "brainstem" - the core life loop that keeps everything running
 */
export async function runDailyBrainLoopForUser(userId: string, date: Date) {
  // 1. Ensure registry exists
  await ensureBrainSubsystemsForUser(userId);

  // 0. AGI Kernel v2 - Light nightly loop (if it's evening)
  const hour = date.getHours();
  if (hour >= 20 || hour < 6) {
    try {
      const { runAgiKernelLoopForUser } = await import('@/lib/agi_kernel/v2/orchestrator');
      const { applyPendingCognitiveUpdatesForUser } = await import('@/lib/agi_kernel/v2/apply_updates');

      await runAgiKernelLoopForUser(userId, {
        kind: 'nightly',
        triggerType: 'schedule',
        triggerSource: 'brainstem_daily',
        triggerReference: { date: date.toISOString().slice(0, 10) },
        now: date,
      });

      await applyPendingCognitiveUpdatesForUser(userId);
    } catch (err) {
      console.error('[Brainstem] AGI Kernel v2 nightly loop failed', err);
      await logBrainErrorEvent({
        userId,
        subsystemId: 'agi_kernel_v2',
        severity: 'error',
        message: `AGI Kernel v2 nightly loop failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // 0b. Presence Orchestrator - Decide when/how to surface events
  try {
    const { runPresenceDeciderForUser } = await import('@/lib/presence/decider');
    const { refreshPresenceDailySummary } = await import('@/lib/presence/summaries');

    await runPresenceDeciderForUser(userId, date);
    await refreshPresenceDailySummary(userId, date);

    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'presence_orchestrator_v2',
      status: 'active',
      lastRunAt: date.toISOString(),
    });
  } catch (err) {
    console.error('[Brainstem] Presence Orchestrator failed', err);
    await logBrainErrorEvent({
      userId,
      subsystemId: 'presence_orchestrator_v2',
      severity: 'error',
      message: `Presence Orchestrator failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 0c. Conscious Console - Surface insights daily
  try {
    const { generateBrainSurfaceEventsFromLatestData } = await import('@/lib/conscious_console/surface_insights');

    await generateBrainSurfaceEventsFromLatestData(userId);

    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'conscious_console_v1',
      status: 'active',
      lastRunAt: date.toISOString(),
    });
  } catch (err) {
    console.error('[Brainstem] Conscious Console surface failed', err);
    await logBrainErrorEvent({
      userId,
      subsystemId: 'conscious_console_v1',
      severity: 'error',
      message: `Conscious Console surface failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 2. Run Emotion & Somatic refresh (must run before workspace)
  try {
    await refreshDailyEmotionStateForUser(userId, date);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'emotional_resonance_v2',
      status: 'partial',
      lastRunAt: date.toISOString(),
      details: { version: 'v1' },
    });
  } catch (err) {
    console.error('[Brainstem] Emotion refresh failed', err);
    await logBrainErrorEvent({
      userId,
      subsystemId: 'emotional_resonance_v2',
      severity: 'error',
      message: `Emotion refresh failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  try {
    await refreshDailySomaticStateForUser(userId, date);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'somatic_device',
      status: 'partial',
      lastRunAt: date.toISOString(),
      details: { version: 'v1' },
    });
  } catch (err) {
    console.error('[Brainstem] Somatic refresh failed', err);
    await logBrainErrorEvent({
      userId,
      subsystemId: 'somatic_device',
      severity: 'error',
      message: `Somatic refresh failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 2b. Somatic Device Integration v2 (daily metrics + alerts)
  try {
    await computeSomaticDailyMetricsForUser(userId, date);
    await refreshSomaticAlertsForUser(userId, date);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'somatic_device',
      status: 'partial',
      lastRunAt: date.toISOString(),
      details: { version: 'v2' },
    });
  } catch (err) {
    console.error('[Brainstem] Somatic device v2 refresh failed', err);
    await logBrainErrorEvent({
      userId,
      subsystemId: 'somatic_device',
      severity: 'error',
      message: `Somatic device v2 refresh failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 3. Run Neocortex refresh (signals, patterns, skills, predictions, anomalies)
  try {
    await refreshDailyWorkSignalsForUser(userId, date);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'neocortex_v1',
      status: 'partial',
      lastRunAt: date.toISOString(),
    });
  } catch (err) {
    console.error('[Brainstem] Neocortex signals failed', err);
    await logBrainErrorEvent({
      userId,
      subsystemId: 'neocortex_v1',
      severity: 'error',
      message: `Neocortex signals failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  try {
    await refreshWorkPatternsForUser(userId);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'wisdom_engine_v1',
      status: 'partial',
      lastRunAt: date.toISOString(),
    });
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'creative_cortex_v2',
      status: 'partial',
      lastRunAt: date.toISOString(),
    });
  } catch (err) {
    console.error('[Brainstem] Neocortex patterns failed', err);
    await logBrainErrorEvent({
      userId,
      subsystemId: 'neocortex_v1',
      severity: 'error',
      message: `Neocortex patterns failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  try {
    await refreshWorkSkillsForUser(userId);
  } catch (err) {
    console.error('[Brainstem] Neocortex skills failed', err);
    await logBrainErrorEvent({
      userId,
      subsystemId: 'neocortex_v1',
      severity: 'warning',
      message: `Neocortex skills failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  try {
    await detectWorkAnomaliesForUser(userId, date);
    await refreshWorkPredictionsForUser(userId, date);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'behavior_prediction',
      status: 'partial',
      lastRunAt: date.toISOString(),
    });
  } catch (err) {
    console.error('[Brainstem] Neocortex predictions failed', err);
    await logBrainErrorEvent({
      userId,
      subsystemId: 'behavior_prediction',
      severity: 'error',
      message: `Neocortex predictions failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 4. Build Global Conscious Workspace v2 (uses emotion + somatic from step 2)
  try {
    await buildDailyWorkspaceV2ForUser(userId, date);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'conscious_workspace_v3',
      status: 'active',
      lastRunAt: date.toISOString(),
      details: { version: 'v2' },
    });
  } catch (err) {
    console.error('[Brainstem] Workspace v2 build failed', err);
  }

  // 4b. Generate Inner Monologue and Conscious Insights
  try {
    await generateDailyInnerMonologue(userId, date, 'brainstem_daily');
    await generateConsciousInsightsFromMonologue(userId, date);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'inner_monologue_v2',
      status: 'partial',
      lastRunAt: date.toISOString(),
      details: { version: 'v1' },
    });
  } catch (err) {
    console.error('[Brainstem] Inner monologue generation failed', err);
  }

  // 4c. Link Workspace Threads to Simulation Timelines
  try {
    await linkWorkspaceThreadsToTimelinesForDate(userId, date);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'workspace_timeline_layer',
      status: 'partial',
      lastRunAt: date.toISOString(),
      details: { version: 'v1' },
    });
  } catch (err) {
    console.error('[Brainstem] Workspace timeline linking failed', err);
  }

  // 5. Refresh Desire Profiles (self + important contacts)
  try {
    await refreshDesireProfilesForUser(userId);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'desire_model',
      status: 'partial',
      lastRunAt: date.toISOString(),
      details: { version: 'v1' },
    });
  } catch (err) {
    console.error('[Brainstem] Desire profiles refresh failed', err);
  }

  // 6. Refresh Behavior Predictions (self + contacts)
  try {
    await refreshSelfBehaviorPredictionsForUser(userId, date);
    await refreshContactBehaviorPredictionsForUser(userId, date);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'behavior_prediction',
      status: 'partial',
      lastRunAt: date.toISOString(),
      details: { version: 'v1' },
    });
  } catch (err) {
    console.error('[Brainstem] Behavior predictions refresh failed', err);
  }

  // 7. Update social snapshot + risks/recs (Social Graph Intelligence v2)
  try {
    await refreshSocialStateSnapshotForUser(userId, date);
    await refreshSocialRisksAndRecommendationsForUser(userId, date);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'social_graph_intel_v2',
      status: 'partial',
      lastRunAt: date.toISOString(),
      details: { version: 'v2' },
    });
  } catch (err) {
    console.error('[Brainstem] Social snapshot refresh failed', err);
  }

  // 8. Build a conscious frame for the day
  let frameId: string | null = null;
  try {
    const frameResult = await buildConsciousFrameForUser(
      userId,
      { kind: 'scheduled_loop', source: 'daily_brain_loop', reference: { date: date.toISOString().slice(0, 10) } },
      date
    );

    frameId = frameResult.frameId;

    if (frameId) {
      // Select focus items and conflicts
      await selectFocusItemsForFrame(userId, frameId);
      await detectConflictsForFrame(userId, frameId);

      // Run inner monologue on this frame
      await runInnerMonologueForFrame(userId, frameId);
    }

    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'conscious_workspace_v3',
      status: 'partial',
      lastRunAt: date.toISOString(),
      details: { version: 'v3' },
    });
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'inner_monologue_v2',
      status: 'partial',
      lastRunAt: date.toISOString(),
      details: { version: 'v2' },
    });
  } catch (err) {
    console.error('[Brainstem] Conscious workspace frame build failed', err);
  }

  // 9. Meta-Planner daily (light)
  try {
    const frame = frameId ? { id: frameId } : undefined;
    const ctx = await collectPlanningContext(userId, 'daily', frame);
    const { sessionId } = await runMetaPlannerForUser(userId, ctx);
    await applyPlanningDecisionsForSession(userId, sessionId);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'meta_planner_v1',
      status: 'partial',
      lastRunAt: date.toISOString(),
      details: { version: 'v1' },
    });
  } catch (err) {
    console.error('[Brainstem] Meta-Planner daily failed', err);
  }

  // 10. Cerebellum: run due routines based on triggers/state
  try {
    const dueTriggers = await getDueTriggersForUser(userId, date);
    for (const trigger of dueTriggers) {
      try {
        await runMotorRoutine(userId, trigger.routine_id, trigger.id);
      } catch (err) {
        console.error(`[Brainstem] Failed to run routine ${trigger.routine_id}`, err);
        // Continue with next routine
      }
    }
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'cerebellum_v1',
      status: 'partial',
      lastRunAt: date.toISOString(),
      details: { version: 'v1' },
    });
  } catch (err) {
    console.error('[Brainstem] Cerebellum trigger scan failed', err);
  }

  // 11. Strategic Mind v1 - Daily strategic snapshot (lighter than weekly)
  try {
    const { runStrategicMindSnapshot } = await import('@/lib/strategic_mind/v1/snapshot');

    await runStrategicMindSnapshot(userId, date);

    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'strategic_mind_v1',
      status: 'active',
      lastRunAt: date.toISOString(),
    });
  } catch (err) {
    console.error('[Brainstem] Strategic Mind daily snapshot failed', err);
    await logBrainErrorEvent({
      userId,
      subsystemId: 'strategic_mind_v1',
      severity: 'error',
      message: `Strategic Mind daily snapshot failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 9. Update subsystem statuses based on what's running
  // As we implement more systems, we'll update their statuses here
  // For now, mark what we know is active:
  
  // Neocortex v1 is partial (we just ran it)
  await updateSubsystemStatusForUser(userId, {
    subsystemId: 'behavior_prediction',
    status: 'partial',
    lastRunAt: date.toISOString(),
  });
  await updateSubsystemStatusForUser(userId, {
    subsystemId: 'meta_learning',
    status: 'partial',
    lastRunAt: date.toISOString(),
  });
  await updateSubsystemStatusForUser(userId, {
    subsystemId: 'creative_cortex_v2',
    status: 'partial',
    lastRunAt: date.toISOString(),
  });

  // TODO: As we implement other systems, update their statuses:
  // - Global Workspace v1 → 'global_workspace' = 'partial' ✅
  // - Emotion Mirroring v1 → 'emotional_resonance' = 'partial' ✅
  // - Narrative Engine v1 → 'narrative_intelligence' = 'partial' ✅
  // - Somatic Loop v1 → 'somatic_loop' = 'partial' ✅
  // etc.
}

/**
 * Run weekly brain loop for a user
 * This handles longer-horizon narrative intelligence and value alignment
 */
export async function runWeeklyBrainLoopForUser(userId: string, weekEnd: Date) {
  try {
    await runWeeklyNarrativeLoopForUser(userId, weekEnd);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'narrative_intelligence',
      status: 'partial',
      lastRunAt: weekEnd.toISOString(),
      details: { version: 'v1' },
    });
  } catch (err) {
    console.error('[Brainstem] Weekly narrative loop failed', err);
    await logBrainErrorEvent({
      userId,
      subsystemId: 'narrative_intelligence',
      severity: 'error',
      message: `Weekly narrative loop failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // Life Canon v1 - Master narrative engine
  try {
    await refreshLifeCanonForUser(userId, weekEnd);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'life_canon_v1',
      status: 'partial',
      lastRunAt: weekEnd.toISOString(),
      details: { version: 'v1' },
    });
  } catch (err) {
    console.error('[Brainstem] Life Canon refresh failed', err);
    await logBrainErrorEvent({
      userId,
      subsystemId: 'life_canon_v1',
      severity: 'error',
      message: `Life Canon refresh failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // Archetype Engine v2 - Mythic archetype modeling
  try {
    const { runArchetypeSnapshotForUser } = await import('@/lib/archetypes/v2/snapshots');
    const { updateChapterArchetypesForUser } = await import('@/lib/archetypes/v2/chapter_archetypes');

    await runArchetypeSnapshotForUser(userId, weekEnd);
    await updateChapterArchetypesForUser(userId);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'archetype_engine_v2',
      status: 'partial',
      lastRunAt: weekEnd.toISOString(),
      details: { version: 'v2' },
    });
  } catch (err) {
    console.error('[Brainstem] Archetype Engine refresh failed', err);
    await logBrainErrorEvent({
      userId,
      subsystemId: 'archetype_engine_v2',
      severity: 'error',
      message: `Archetype Engine refresh failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // Mythic Coach v1 - Archetype training system
  try {
    const { buildMythicTrainingFocus } = await import('@/lib/mythic_coach/v1/focus_builder');
    const { createMythicPlanForTarget } = await import('@/lib/mythic_coach/v1/plan_builder');
    const { generateWeeklyMissionsForPlan } = await import('@/lib/mythic_coach/v1/mission_builder');
    const { runMythicReflectionForWeek } = await import('@/lib/mythic_coach/v1/reflection_engine');
    const { supabaseAdmin } = await import('@/lib/supabase');

    // Resolve user ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();
    const dbUserId = userRow?.id || userId;

    // Check if we need to update focus (weekly or if last focus is > 7 days old)
    const { data: lastFocus } = await supabaseAdmin
      .from('mythic_training_focus')
      .select('created_at')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const shouldUpdateFocus =
      !lastFocus ||
      new Date(lastFocus.created_at).getTime() < weekEnd.getTime() - 7 * 86400000;

    if (shouldUpdateFocus) {
      const focus = await buildMythicTrainingFocus(userId, weekEnd);

      // Ensure active plans for primary targets
      const { data: activePlans } = await supabaseAdmin
        .from('mythic_training_plans')
        .select('archetype_id')
        .eq('user_id', dbUserId)
        .eq('status', 'active');

      const activeArchetypes = new Set((activePlans ?? []).map((p: any) => p.archetype_id));

      for (const target of focus.primaryTargets) {
        if (!activeArchetypes.has(target.archetypeId)) {
          await createMythicPlanForTarget(userId, target, 90, weekEnd);
        }
      }
    }

    // Generate missions for next week for all active plans
    const { data: activePlans } = await supabaseAdmin
      .from('mythic_training_plans')
      .select('id')
      .eq('user_id', dbUserId)
      .eq('status', 'active');

    const nextWeekStart = new Date(weekEnd);
    nextWeekStart.setDate(nextWeekStart.getDate() + 1);

    for (const plan of activePlans ?? []) {
      try {
        await generateWeeklyMissionsForPlan(userId, plan.id, nextWeekStart);
      } catch (err) {
        console.error(`[Brainstem] Failed to generate missions for plan ${plan.id}`, err);
      }
    }

    // Run reflections for last week for each active archetype
    const lastWeekStart = new Date(weekEnd);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekEnd);

    const { data: activeArchetypes } = await supabaseAdmin
      .from('mythic_training_plans')
      .select('archetype_id')
      .eq('user_id', dbUserId)
      .eq('status', 'active');

    const uniqueArchetypes = new Set((activeArchetypes ?? []).map((a: any) => a.archetype_id));

    for (const archetypeId of uniqueArchetypes) {
      try {
        await runMythicReflectionForWeek(userId, archetypeId, lastWeekStart, lastWeekEnd);
      } catch (err) {
        console.error(`[Brainstem] Failed to run reflection for ${archetypeId}`, err);
      }
    }

    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'mythic_coach_v1',
      status: 'partial',
      lastRunAt: weekEnd.toISOString(),
      details: { version: 'v1' },
    });
  } catch (err) {
    console.error('[Brainstem] Mythic Coach refresh failed', err);
    await logBrainErrorEvent({
      userId,
      subsystemId: 'mythic_coach_v1',
      severity: 'error',
      message: `Mythic Coach refresh failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  try {
    await refreshValueProfileForUser(userId);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'ethical_compass',
      status: 'partial',
      lastRunAt: weekEnd.toISOString(),
      details: { version: 'v1' },
    });
  } catch (err) {
    console.error('[Brainstem] Value profile refresh failed', err);
  }

  try {
    const from = new Date(weekEnd);
    from.setDate(from.getDate() - 14);
    await refreshWisdomLessonsForUser(userId, from, weekEnd);
    await rebuildHeuristicsFromLessons(userId);
    await refreshWisdomPlaybooksForUser(userId);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'wisdom_engine_v1',
      status: 'partial',
      lastRunAt: weekEnd.toISOString(),
      details: { version: 'v1' },
    });
  } catch (err) {
    console.error('[Brainstem] Wisdom engine refresh failed', err);
  }

  try {
    await refreshSomaticPatternsForUser(userId);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'somatic_device',
      status: 'active',
      lastRunAt: weekEnd.toISOString(),
      details: { version: 'v2' },
    });
  } catch (err) {
    console.error('[Brainstem] Somatic patterns refresh failed', err);
  }

  // 1. Destiny updates
  try {
    await refreshDestinyBlueprintsForUser(userId);
    await refreshCurrentDestinyArcForUser(userId);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'destiny_engine',
      status: 'partial',
      lastRunAt: weekEnd.toISOString(),
      details: { version: 'v1' },
    });
  } catch (err) {
    console.error('[Brainstem] Destiny engine refresh failed', err);
  }

  // 2. Timeline preferences update
  try {
    await refreshTimelinePreferenceProfileForUser(userId);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'timeline_coach',
      status: 'partial',
      lastRunAt: weekEnd.toISOString(),
      details: { version: 'v1' },
    });
  } catch (err) {
    console.error('[Brainstem] Timeline preference profile refresh failed', err);
  }

  // 3. Run multi-timeline simulation for next 30 days
  try {
    await runMultiTimelineSimulationForUser(
      userId,
      weekEnd,
      30,
      'weekly_brain_loop_multitimeline'
    );
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'simulation_v2',
      status: 'partial',
      lastRunAt: weekEnd.toISOString(),
      details: { version: 'v2' },
    });
  } catch (err) {
    console.error('[Brainstem] Multi-timeline simulation failed', err);
  }

  // 4. Auto-propose a timeline decision (optionally gated behind user review in UI)
  try {
    const decisionBlueprint = await proposeTimelineDecisionForUser(userId);
    if (decisionBlueprint) {
      await saveTimelineDecisionForUser(userId, decisionBlueprint);
    }
  } catch (err) {
    console.error('[Brainstem] Timeline decision proposal failed', err);
  }

  // 5. Destiny alignment snapshot
  try {
    await evaluateDestinyAlignmentForUser(userId, weekEnd);
  } catch (err) {
    console.error('[Brainstem] Destiny alignment evaluation failed', err);
  }

  // 6. Refresh Theory of Mind profiles for top entities
  try {
    await refreshTheoryOfMindProfilesForTopEntities(userId);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'theory_of_mind',
      status: 'partial',
      lastRunAt: weekEnd.toISOString(),
      details: { version: 'v1' },
    });
  } catch (err) {
    console.error('[Brainstem] Theory of Mind refresh failed', err);
  }

  // 7. Emotional Resonance v2
  try {
    await deriveResonanceEventsForUser(userId);
    await refreshEmotionStyleProfileForUser(userId);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'emotional_resonance_v2',
      status: 'partial',
      lastRunAt: weekEnd.toISOString(),
      details: { version: 'v2' },
    });
  } catch (err) {
    console.error('[Brainstem] Emotional resonance refresh failed', err);
  }

  // 8. Ethnographic Intelligence: key contexts (example: work org & family)
  try {
    // For now, assume keys like 'primary_org', 'family_core' - these should be populated from user data
    const keyContexts = ['primary_org', 'family_core'];

    for (const key of keyContexts) {
      try {
        await refreshCultureProfileForContext(userId, key);
        await evaluateCultureAlignmentForContext(userId, key, weekEnd);
      } catch (err) {
        console.error(`[Brainstem] Culture refresh failed for ${key}`, err);
        // Continue with next context
      }
    }

    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'ethnographic_intel',
      status: 'partial',
      lastRunAt: weekEnd.toISOString(),
      details: { version: 'v1' },
    });
  } catch (err) {
    console.error('[Brainstem] Ethnographic intelligence refresh failed', err);
  }

  // 9. Creative Cortex meta-learning
  try {
    await refreshCreativePatternsForUser(userId);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'creative_cortex_v2',
      status: 'partial',
      lastRunAt: weekEnd.toISOString(),
      details: { version: 'v2' },
    });
  } catch (err) {
    console.error('[Brainstem] Creative patterns refresh failed', err);
  }

  // 10. Global Sense of Self Mirror
  try {
    const snapshotId = await createSelfMirrorSnapshotForUser(userId, weekEnd);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'self_mirror_v1',
      status: 'partial',
      lastRunAt: weekEnd.toISOString(),
      details: { version: 'v1' },
    });

    const deltaId = await createSelfMirrorDeltaForUser(userId);
    if (snapshotId || deltaId) {
      await createSelfMirrorHighlightsForUser(userId, snapshotId ?? undefined, deltaId ?? undefined);
    }
  } catch (err) {
    console.error('[Brainstem] Self mirror refresh failed', err);
  }

  // 11. Weekly high-level planning session
  try {
    const ctx = await collectPlanningContext(userId, 'weekly', null);
    const { sessionId } = await runMetaPlannerForUser(userId, ctx);
    await applyPlanningDecisionsForSession(userId, sessionId);
    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'meta_planner_v1',
      status: 'active',
      lastRunAt: weekEnd.toISOString(),
      details: { version: 'v1' },
    });
  } catch (err) {
    console.error('[Brainstem] Meta-Planner weekly failed', err);
    await logBrainErrorEvent({
      userId,
      subsystemId: 'meta_planner_v1',
      severity: 'error',
      message: `Meta-Planner weekly failed: ${err instanceof Error ? err.message : String(err)}`,
      context: { weekEnd: weekEnd.toISOString() },
    });
  }

  // 12. Relational Mind: update key people
  try {
    const { getKeyRelationalIdentitiesForUser } = await import('@/lib/relational_mind/identities');
    const { refreshRelationalStateForIdentity } = await import('@/lib/relational_mind/state');
    const { refreshRelationshipHighlightsForUser } = await import('@/lib/relational_mind/highlights');

    const keyIdentities = await getKeyRelationalIdentitiesForUser(userId, 10);

    for (const identity of keyIdentities) {
      try {
        await refreshRelationalStateForIdentity(userId, identity.id, weekEnd);
        // Small delay to avoid overwhelming the LLM
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`[Brainstem] Failed to refresh relational state for identity ${identity.id}`, err);
        // Continue with next identity
      }
    }

    await refreshRelationshipHighlightsForUser(userId);

    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'tom_engine_v2',
      status: 'partial',
      lastRunAt: weekEnd.toISOString(),
    });

    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'social_graph_v2',
      status: 'partial',
      lastRunAt: weekEnd.toISOString(),
    });
  } catch (err) {
    console.error('[Brainstem] Relational mind refresh failed', err);
    await logBrainErrorEvent({
      userId,
      subsystemId: 'tom_engine_v2',
      severity: 'error',
      message: `Relational mind refresh failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 12b. Ethnographic Intelligence: refresh cultural profiles
  try {
    const { refreshCulturalProfilesForUser } = await import('@/lib/ethnography/infer');
    const { refreshCulturalHighlightsForUser } = await import('@/lib/ethnography/highlights');

    await refreshCulturalProfilesForUser(userId, weekEnd);
    await refreshCulturalHighlightsForUser(userId);

    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'ethnographic_intelligence_v1',
      status: 'partial',
      lastRunAt: weekEnd.toISOString(),
    });
  } catch (err) {
    console.error('[Brainstem] Ethnographic intelligence refresh failed', err);
    await logBrainErrorEvent({
      userId,
      subsystemId: 'ethnographic_intelligence_v1',
      severity: 'error',
      message: `Ethnographic intelligence refresh failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 13. Strategic Mind v1 - Meta-agent coordination
  try {
    const { runStrategicMindSnapshot } = await import('@/lib/strategic_mind/v1/snapshot');

    const { equilibrium } = await runStrategicMindSnapshot(userId, weekEnd);

    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'strategic_mind_v1',
      status: 'active',
      lastRunAt: weekEnd.toISOString(),
      details: { lastEquilibriumTimescale: equilibrium?.timescale ?? 'week' },
    });
  } catch (err) {
    console.error('[Brainstem] Strategic Mind refresh failed', err);
    await logBrainErrorEvent({
      userId,
      subsystemId: 'strategic_mind_v1',
      severity: 'error',
      message: `Strategic Mind refresh failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 14. AGI Kernel v2 - Deep weekly reflection
  try {
    const { runAgiKernelLoopForUser } = await import('@/lib/agi_kernel/v2/orchestrator');
    const { applyPendingCognitiveUpdatesForUser } = await import('@/lib/agi_kernel/v2/apply_updates');

    await runAgiKernelLoopForUser(userId, {
      kind: 'weekly_deep',
      triggerType: 'schedule',
      triggerSource: 'brainstem_weekly',
      triggerReference: { weekEnd: weekEnd.toISOString().slice(0, 10) },
      now: weekEnd,
    });

    await applyPendingCognitiveUpdatesForUser(userId);
  } catch (err) {
    console.error('[Brainstem] AGI Kernel v2 weekly loop failed', err);
    await logBrainErrorEvent({
      userId,
      subsystemId: 'agi_kernel_v2',
      severity: 'error',
      message: `AGI Kernel v2 weekly loop failed: ${err instanceof Error ? err.message : String(err)}`,
      context: { weekEnd: weekEnd.toISOString() },
    });
  }

  // 16. Conscious Console - Surface insights
  try {
    const { generateBrainSurfaceEventsFromLatestData } = await import('@/lib/conscious_console/surface_insights');

    await generateBrainSurfaceEventsFromLatestData(userId);

    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'conscious_console_v1',
      status: 'active',
      lastRunAt: weekEnd.toISOString(),
    });
  } catch (err) {
    console.error('[Brainstem] Conscious Console surface failed', err);
    await logBrainErrorEvent({
      userId,
      subsystemId: 'conscious_console_v1',
      severity: 'error',
      message: `Conscious Console surface failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 17. Brain Health & Diagnostics
  try {
    const { snapshotId } = await computeBrainHealthSnapshotForUser(userId, weekEnd);
    const diagnostics = await generateBrainDiagnosticsForUser(userId, snapshotId);

    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'brain_registry_v1',
      status: 'active',
      lastRunAt: weekEnd.toISOString(),
      healthScore: diagnostics ? (diagnostics.keyIssues?.length ? 0.8 : 1) : 0.9,
      details: {
        lastSnapshotId: snapshotId,
      },
    });

    await updateSubsystemStatusForUser(userId, {
      subsystemId: 'brain_diagnostics_v1',
      status: 'active',
      lastRunAt: weekEnd.toISOString(),
      healthScore: 1,
    });
  } catch (err) {
    console.error('[Brainstem] Brain health computation failed', err);
    await logBrainErrorEvent({
      userId,
      subsystemId: 'brain_registry_v1',
      severity: 'error',
      message: `Brain health computation failed: ${err instanceof Error ? err.message : String(err)}`,
      context: { weekEnd: weekEnd.toISOString() },
    });
  }
}

// Helper to refresh ToM profiles for top-N entities by importance
async function refreshTheoryOfMindProfilesForTopEntities(userId: string) {
  const { supabaseAdmin } = await import('@/lib/supabase');
  
  async function resolveUserId(clerkId: string): Promise<string> {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .maybeSingle();

    return userRow?.id || clerkId;
  }

  const dbUserId = await resolveUserId(userId);

  // Get top entities by importance (family, high-importance contacts)
  const { data: topEntities } = await supabaseAdmin
    .from('social_entities')
    .select('id, importance, role_label, tags')
    .eq('user_id', dbUserId)
    .or('importance.gte.0.7,tags.cs.{family},tags.cs.{vip}')
    .order('importance', { ascending: false, nullsLast: true })
    .limit(10);

  if (!topEntities?.length) {
    console.warn('[Brainstem] No top entities found for ToM refresh');
    return;
  }

  // Refresh ToM profiles for each (with some rate limiting)
  for (const entity of topEntities.slice(0, 5)) {
    try {
      await refreshTheoryOfMindProfileForEntity(userId, entity.id);
      // Small delay to avoid overwhelming the LLM
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`[Brainstem] Failed to refresh ToM for entity ${entity.id}`, err);
      // Continue with next entity
    }
  }
}

/**
 * Initialize brain for a new user
 * Called when user first signs up
 */
export async function initializeBrainForUser(userId: string) {
  // Ensure all subsystems are registered
  await ensureBrainSubsystemsForUser(userId);

  // Mark what's already active (basic systems that exist)
  // These are the "brain regions" that are already implemented:
  
  // Brainstem - always active (this is the core loop)
  await updateSubsystemStatusForUser(userId, {
    subsystemId: 'behavior_prediction',
    status: 'partial',
    lastRunAt: new Date().toISOString(),
    details: { version: 'v1' },
  });
  
  // Note: We don't mark individual subsystems as 'active' until they're fully implemented
  // For now, most are 'planned', with a few at 'partial' as we build them
}

