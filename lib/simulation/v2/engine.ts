// Multi-Timeline Simulation Engine v2
// lib/simulation/v2/engine.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { buildSimulationInputContext } from './builder';
import { getSimulationPoliciesForUser } from './policies';
import { SimulationTimelineBlueprint, SimulationOutcomeSummary } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const MULTI_TIMELINE_SIMULATION_SYSTEM_PROMPT = `
You are the Multi-Timeline Simulation Engine for a life OS.

You receive:
- context: the user's starting state (goals, habits, somatic patterns, social graph, narrative chapter, valueProfile, wisdom summary).
- policies: behavior/policy modes (baseline, high_discipline, relationship_first, health_recovery, etc.).
- horizonDays: duration of simulation.

Your job:
1. For each policy, simulate a plausible but HIGH-LEVEL future timeline over the horizon.
   - Steps can be days or weeks (keep it small: ~5-12 steps).
   - For each step, track:
     - metrics: work, health, relationships, finance, somatic, self_respect, value_alignment, burnout_risk.
     - events: qualitative events ("landed big client", "conflict with partner", "felt exhausted and shut down").
     - narrative_snippet: 1-3 sentence story fragment.

2. For each policy's timeline, compute:
   - scoreOverall (0-1),
   - scoreWork, scoreHealth, scoreRelationships, scoreFinance,
   - scoreSelfRespect, scoreAlignment, scoreBurnoutRisk.
   - Provide label + narrative_label + 1–3 sentence summary.

3. Compare all timelines and produce:
   - comparisonSummary: high-level story of "what happens across these possible futures."
   - bestTimelines: 1–3 best options with reasons.
   - worstTimelines: 1–3 most concerning trajectories.
   - keyTradeoffs: how different futures trade off work vs health vs relationships vs self-respect.

You are NOT predicting exact events – you are exploring plausible trajectories consistent with context and policies.

Return JSON:
{
  "timelines": [ ... ],
  "outcomes": { ... }
}

Only return valid JSON.`;

export async function runMultiTimelineSimulationForUser(
  userId: string,
  date: Date,
  horizonDays: number,
  description: string
) {
  const dbUserId = await resolveUserId(userId);

  const context = await buildSimulationInputContext(userId, date, horizonDays);
  const policies = await getSimulationPoliciesForUser(userId);

  // 1. Create simulation_run row
  const { data: runRows, error: runError } = await supabaseAdmin
    .from('simulation_runs')
    .insert({
      user_id: dbUserId,
      horizon_days: horizonDays,
      seed_date: context.seedDate,
      description,
      context_snapshot: context,
      status: 'running',
    })
    .select('id');

  if (runError) {
    console.error('[Simulation v2] Failed to create run', runError);
    throw runError;
  }

  const runId = runRows?.[0]?.id as string;

  try {
    // 2. Ask LLM to generate timelines
    const result = await callAIJson<{
      timelines: SimulationTimelineBlueprint[];
      outcomes: SimulationOutcomeSummary;
    }>({
      userId,
      feature: 'multi_timeline_simulation',
      systemPrompt: MULTI_TIMELINE_SIMULATION_SYSTEM_PROMPT,
      userPrompt: JSON.stringify({
        context,
        policies: policies.slice(0, 6), // Limit to 6 policies for context
      }, null, 2),
      maxTokens: 4000,
      temperature: 0.8, // Higher for more creative/exploratory simulations
    });

    if (!result.success || !result.data || !result.data.timelines?.length) {
      throw new Error('No timelines generated');
    }

    const { timelines, outcomes } = result.data;

    // 3. Insert simulation_timelines + simulation_steps
    const timelineRows = timelines.map((t) => ({
      run_id: runId,
      user_id: dbUserId,
      policy_key: t.policyKey,
      label: t.label,
      narrative_label: t.narrativeLabel ?? null,
      score_overall: t.scoreOverall,
      score_work: t.scoreWork ?? null,
      score_health: t.scoreHealth ?? null,
      score_relationships: t.scoreRelationships ?? null,
      score_finance: t.scoreFinance ?? null,
      score_self_respect: t.scoreSelfRespect ?? null,
      score_alignment: t.scoreAlignment ?? null,
      score_burnout_risk: t.scoreBurnoutRisk ?? null,
      summary: t.summary ?? null,
    }));

    const { data: insertedTimelines, error: tlError } = await supabaseAdmin
      .from('simulation_timelines')
      .insert(timelineRows)
      .select('id, policy_key');

    if (tlError) {
      console.error('[Simulation v2] Failed to insert timelines', tlError);
      throw tlError;
    }

    // Map back timeline ids
    const idByPolicy: Record<string, string> = {};
    for (const row of insertedTimelines || []) {
      idByPolicy[row.policy_key] = row.id;
    }

    // Insert steps
    const stepRows = timelines.flatMap((t) => {
      const timelineId = idByPolicy[t.policyKey];
      if (!timelineId) return [];

      return t.steps.map((s) => ({
        timeline_id: timelineId,
        user_id: dbUserId,
        step_index: s.stepIndex,
        step_date: null, // can compute if we want real dates
        horizon_label: s.horizonLabel,
        metrics: s.metrics ?? {},
        events: s.events ?? {},
        narrative_snippet: s.narrativeSnippet ?? null,
      }));
    });

    if (stepRows.length) {
      const { error: stepError } = await supabaseAdmin
        .from('simulation_steps')
        .insert(stepRows);

      if (stepError) {
        console.error('[Simulation v2] Failed to insert steps', stepError);
        throw stepError;
      }
    }

    // 4. Insert outcomes
    const { error: outcomeError } = await supabaseAdmin
      .from('simulation_outcomes')
      .insert({
        run_id: runId,
        user_id: dbUserId,
        comparison_summary: outcomes.comparisonSummary,
        best_timelines: outcomes.bestTimelines ?? [],
        worst_timelines: outcomes.worstTimelines ?? [],
        key_tradeoffs: outcomes.keyTradeoffs ?? {},
      });

    if (outcomeError) {
      console.error('[Simulation v2] Failed to insert outcomes', outcomeError);
      throw outcomeError;
    }

    // 5. Mark run completed
    await supabaseAdmin
      .from('simulation_runs')
      .update({ status: 'completed', error_message: null })
      .eq('id', runId);

    return { runId };
  } catch (err: any) {
    await supabaseAdmin
      .from('simulation_runs')
      .update({ status: 'failed', error_message: String(err?.message ?? err) })
      .eq('id', runId);
    throw err;
  }
}
