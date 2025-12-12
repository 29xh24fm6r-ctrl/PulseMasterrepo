// Timeline Coach Core
// lib/timeline_coach/coach.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { TimelineDecisionBlueprint, TimelineChoiceContext } from './types';
import { getTimelinePreferenceProfileForUser } from './preferences';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const TIMELINE_DECISION_PROMPT = `
You are the Timeline Coach.

You see:
- Several simulated futures (timelines) for the next 30-90 days.
- For each future: scores for work/health/relationships/finance/self-respect/value alignment/burnout.
- A comparison summary.
- The user's preferenceProfile and valueProfile.
- The current narrative chapter context.

Your job:
1. Compare the timelines through the lens of:
   - the user's values,
   - their long-term story,
   - their preferences and risk tolerance.

2. Choose ONE timeline to recommend as the "Season Arc" for the upcoming period:
   - horizonDays should match the simulation horizon (e.g. 30 or 90).
   - Provide label and rationale.
   - Explicitly name perceivedBenefits and perceivedCosts (tradeoffs).
   - Set confidence (0–1).
   - Suggest a seasonStart and seasonEnd.

3. Translate this chosen timeline into 3–10 concrete commitments:
   - habits: repeated behaviors,
   - constraints/guardrails: things NOT to do,
   - focus_areas: priorities for this season,
   - optional "no-go" lines (what they refuse to sacrifice).

Return JSON:
{
  "decision": {
    "runId": "...",
    "chosenTimelineId": "...",
    "horizonDays": ...,
    "label": "...",
    "rationale": "...",
    "perceivedBenefits": { ... },
    "perceivedCosts": { ... },
    "confidence": ...,
    "seasonStart": "YYYY-MM-DD",
    "seasonEnd": "YYYY-MM-DD",
    "commitments": [ ... ]
  }
}

Only return valid JSON.`;

async function getValueProfileForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data } = await supabaseAdmin
    .from('value_profile')
    .select('*')
    .eq('user_id', dbUserId)
    .limit(1);

  return data?.[0] ?? null;
}

export async function buildTimelineChoiceContextForUser(userId: string): Promise<TimelineChoiceContext | null> {
  const dbUserId = await resolveUserId(userId);

  const { data: runs } = await supabaseAdmin
    .from('simulation_runs')
    .select('*')
    .eq('user_id', dbUserId)
    .order('created_at', { ascending: false })
    .limit(1);

  const run = runs?.[0];
  if (!run) return null;

  const [{ data: timelines }, { data: outcomes }, preferenceProfile, valueProfile, narrativeContext] =
    await Promise.all([
      supabaseAdmin
        .from('simulation_timelines')
        .select('*')
        .eq('user_id', dbUserId)
        .eq('run_id', run.id)
        .order('score_overall', { ascending: false }),
      supabaseAdmin
        .from('simulation_outcomes')
        .select('*')
        .eq('user_id', dbUserId)
        .eq('run_id', run.id)
        .limit(1),
      getTimelinePreferenceProfileForUser(userId).catch(() => null),
      getValueProfileForUser(userId).catch(() => null),
      supabaseAdmin
        .from('narrative_snapshots')
        .select('*')
        .eq('user_id', dbUserId)
        .order('snapshot_at', { ascending: false })
        .limit(1)
        .then((res) => res.data?.[0] ?? null)
        .catch(() => null),
    ]);

  return {
    run,
    timelines: timelines ?? [],
    outcome: outcomes?.[0] ?? null,
    preferenceProfile,
    valueProfile,
    narrativeContext,
  };
}

export async function proposeTimelineDecisionForUser(userId: string): Promise<TimelineDecisionBlueprint | null> {
  const ctx = await buildTimelineChoiceContextForUser(userId);
  if (!ctx || !(ctx.timelines?.length)) {
    console.warn('[Timeline Coach] No context or timelines available');
    return null;
  }

  const result = await callAIJson<{ decision: TimelineDecisionBlueprint }>({
    userId,
    feature: 'timeline_decision',
    systemPrompt: TIMELINE_DECISION_PROMPT,
    userPrompt: JSON.stringify({
      run: {
        id: ctx.run.id,
        horizonDays: ctx.run.horizon_days,
        seedDate: ctx.run.seed_date,
      },
      timelines: ctx.timelines.map((t: any) => ({
        id: t.id,
        policyKey: t.policy_key,
        label: t.label,
        narrativeLabel: t.narrative_label,
        scoreOverall: t.score_overall,
        scoreWork: t.score_work,
        scoreHealth: t.score_health,
        scoreRelationships: t.score_relationships,
        scoreFinance: t.score_finance,
        scoreSelfRespect: t.score_self_respect,
        scoreAlignment: t.score_alignment,
        scoreBurnoutRisk: t.score_burnout_risk,
        summary: t.summary,
      })),
      outcome: ctx.outcome ? {
        comparisonSummary: ctx.outcome.comparison_summary,
        bestTimelines: ctx.outcome.best_timelines || [],
        worstTimelines: ctx.outcome.worst_timelines || [],
        keyTradeoffs: ctx.outcome.key_tradeoffs || {},
      } : null,
      preferenceProfile: ctx.preferenceProfile ? {
        domainWeights: ctx.preferenceProfile.domainWeights,
        riskTolerance: ctx.preferenceProfile.riskTolerance,
        timePreferences: ctx.preferenceProfile.timePreferences,
        summary: ctx.preferenceProfile.summary,
      } : null,
      valueProfile: ctx.valueProfile ? {
        summary: ctx.valueProfile.summary,
        coreValues: ctx.valueProfile.core_values || [],
        rolePriorities: ctx.valueProfile.role_priorities || {},
        redLines: ctx.valueProfile.red_lines || [],
      } : null,
      narrativeContext: ctx.narrativeContext ? {
        snapshot: ctx.narrativeContext,
      } : null,
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Timeline Coach] Failed to generate decision', result.error);
    return null;
  }

  return result.data.decision;
}


