// Timeline Reflection Engine
// lib/timeline_coach/reflection.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const TIMELINE_REFLECTION_PROMPT = `
You are the Timeline Reflection Engine.

You see:
- The original timeline decision and commitments.
- Experience events during this season.

Your job:
1. Summarize how this season actually went and felt.
2. Evaluate alignmentChange (-1..1) and satisfactionScore (0..1).
3. Note regrets and surprises (good and bad).
4. Extract lessons for future timeline choices (what to prefer or avoid).

Return JSON: { "reflection": { ... } }.

Only return valid JSON.`;

export async function generateTimelineReflectionForDecision(
  userId: string,
  decisionId: string,
  periodStart: Date,
  periodEnd: Date
) {
  const dbUserId = await resolveUserId(userId);

  const [{ data: decisions }, { data: commitments }, experiencesRes] = await Promise.all([
    supabaseAdmin
      .from('timeline_decisions')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('id', decisionId)
      .limit(1),
    supabaseAdmin
      .from('timeline_commitments')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('decision_id', decisionId),
    supabaseAdmin
      .from('experience_events')
      .select('*')
      .eq('user_id', dbUserId)
      .gte('occurred_at', periodStart.toISOString())
      .lte('occurred_at', periodEnd.toISOString())
      .order('occurred_at', { ascending: true }),
  ]);

  const decision = decisions?.[0];
  if (!decision) {
    console.warn('[Timeline Coach] Decision not found for reflection');
    return;
  }

  const result = await callAIJson<{
    reflection: {
      feltOutcomeSummary: string;
      alignmentChange: number;
      satisfactionScore: number;
      regrets: any;
      surprises: any;
      lessons: any;
    };
  }>({
    userId,
    feature: 'timeline_reflection',
    systemPrompt: TIMELINE_REFLECTION_PROMPT,
    userPrompt: JSON.stringify({
      decision: {
        label: decision.label,
        rationale: decision.rationale,
        perceivedBenefits: decision.perceived_benefits,
        perceivedCosts: decision.perceived_costs,
        seasonStart: decision.season_start,
        seasonEnd: decision.season_end,
      },
      commitments: (commitments || []).map((c: any) => ({
        kind: c.kind,
        label: c.label,
        description: c.description,
        isActive: c.is_active,
        brokenCount: c.broken_count,
        upheldCount: c.upheld_count,
      })),
      experiences: (experiencesRes.data || []).slice(0, 50).map((e: any) => ({
        source: e.source,
        kind: e.kind,
        description: e.description,
        evaluation: e.evaluation || {},
      })),
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    }, null, 2),
    maxTokens: 2500,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Timeline Coach] Failed to generate reflection', result.error);
    return;
  }

  const { reflection } = result.data;

  const { error } = await supabaseAdmin
    .from('timeline_reflections')
    .insert({
      user_id: dbUserId,
      decision_id: decisionId,
      period_start: periodStart.toISOString().slice(0, 10),
      period_end: periodEnd.toISOString().slice(0, 10),
      felt_outcome_summary: reflection.feltOutcomeSummary,
      alignment_change: reflection.alignmentChange,
      satisfaction_score: reflection.satisfactionScore,
      regrets: reflection.regrets ?? {},
      surprises: reflection.surprises ?? {},
      lessons: reflection.lessons ?? {},
    });

  if (error) {
    console.error('[Timeline Coach] Failed to save reflection', error);
    throw error;
  }
}


