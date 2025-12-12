// What-If Replay Mode v1 - Simulation Engine
// lib/what_if_replay/v1/simulate.ts

import { supabaseAdminClient } from '../../supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { WhatIfMode, WhatIfScenarioInput } from './types';
import { buildWhatIfSimulationContext } from './context';
import { WHAT_IF_TIMELINE_PROMPT, WHAT_IF_NARRATIVE_PROMPT } from './prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function createWhatIfScenario(
  userId: string,
  input: WhatIfScenarioInput
): Promise<string> {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdminClient
    .from('what_if_scenarios')
    .insert({
      user_id: dbUserId,
      label: input.label,
      description: input.description ?? null,
      origin_type: input.originType,
      origin_id: input.originId ?? null,
      anchor_time: input.anchorTime ?? null,
      timescale: input.timescale ?? null,
      base_assumption: input.baseAssumption,
      alternate_assumption: input.alternateAssumption,
      parameters: input.parameters ?? {},
      status: 'ready',
    })
    .select('id');

  if (error) throw error;
  return data?.[0]?.id as string;
}

export async function runWhatIfSimulation(
  userId: string,
  now: Date,
  params: {
    scenarioId: string;
    horizon: string;        // '6_months','1_year','3_years','5_years'
    mode: WhatIfMode;
  }
) {
  const dbUserId = await resolveUserId(userId);

  // Load scenario
  const { data: scenarioRow, error: scenarioError } = await supabaseAdminClient
    .from('what_if_scenarios')
    .select('*')
    .eq('id', params.scenarioId)
    .eq('user_id', dbUserId)
    .maybeSingle();

  if (scenarioError) throw scenarioError;
  if (!scenarioRow) throw new Error('Scenario not found');

  const context = await buildWhatIfSimulationContext(dbUserId, now, {
    scenario: {
      label: scenarioRow.label,
      baseAssumption: scenarioRow.base_assumption,
      alternateAssumption: scenarioRow.alternate_assumption,
      horizon: params.horizon,
      mode: params.mode,
      anchorTime: scenarioRow.anchor_time,
    },
  });

  const result = await callAIJson<{
    baseline: any;
    alternate: any;
    deltas: any;
  }>({
    userId,
    feature: 'what_if_timeline',
    systemPrompt: WHAT_IF_TIMELINE_PROMPT,
    userPrompt: `Context:\n${JSON.stringify(context, null, 2)}`,
    maxTokens: 4000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    throw new Error(`Failed to simulate timelines: ${result.error}`);
  }

  const { baseline, alternate, deltas } = result.data;

  const { data: runRows, error: runError } = await supabaseAdminClient
    .from('what_if_runs')
    .insert({
      scenario_id: scenarioRow.id,
      user_id: dbUserId,
      mode: params.mode,
      horizon: params.horizon,
      baseline_timeline: baseline ?? {},
      alternate_timeline: alternate ?? {},
      deltas: deltas ?? {},
      meta: {},
    })
    .select('id');

  if (runError) throw runError;
  const runId = runRows?.[0]?.id as string;

  const narrativeResult = await callAIJson<{
    narrativeBaseline: string;
    narrativeAlternate: string;
    metricsBaseline: any;
    metricsAlternate: any;
    highlightDifferences: string[];
  }>({
    userId,
    feature: 'what_if_narrative',
    systemPrompt: WHAT_IF_NARRATIVE_PROMPT,
    userPrompt: `Timeline Data:\n${JSON.stringify({
      baseline,
      alternate,
      deltas,
    }, null, 2)}`,
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!narrativeResult.success || !narrativeResult.data) {
    throw new Error(`Failed to generate narratives: ${narrativeResult.error}`);
  }

  const {
    narrativeBaseline,
    narrativeAlternate,
    metricsBaseline,
    metricsAlternate,
    highlightDifferences,
  } = narrativeResult.data;

  const { error: outcomeError } = await supabaseAdminClient
    .from('what_if_outcomes')
    .insert({
      run_id: runId,
      user_id: dbUserId,
      narrative_baseline: narrativeBaseline ?? '',
      narrative_alternate: narrativeAlternate ?? '',
      metrics_baseline: metricsBaseline ?? {},
      metrics_alternate: metricsAlternate ?? {},
      highlight_differences: highlightDifferences ?? [],
    });

  if (outcomeError) throw outcomeError;

  return {
    scenario: scenarioRow,
    runId,
    baseline,
    alternate,
    deltas,
    narrativeBaseline,
    narrativeAlternate,
    metricsBaseline,
    metricsAlternate,
    highlightDifferences,
  };
}

