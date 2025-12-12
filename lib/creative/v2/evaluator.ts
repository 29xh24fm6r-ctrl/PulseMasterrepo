// Creative Idea Evaluator
// lib/creative/v2/evaluator.ts

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

const CREATIVE_EVALUATION_PROMPT = `
You are the Creative Evaluator.

You see:
- A set of creative ideas for this session.
- The user's Destiny & current arc (if available).
- Timeline context (near-term preferred future).

Your job:
1. Re-score ideas based on:
   - alignment to Destiny and values,
   - impact,
   - feasibility,
   - timing (is this the right season?).

2. For each idea:
   - Provide updatedScores.
   - Optionally provide a decision: 'prioritize', 'later', 'drop'.

Return JSON: { "ranking": [ ... ] }.

Only return valid JSON.`;

async function getCurrentDestinyContextForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data: arcs } = await supabaseAdmin
    .from('destiny_arcs')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('is_current', true)
    .limit(1);

  return arcs?.[0] ?? null;
}

async function getTimelineChoiceContextForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data: decisions } = await supabaseAdmin
    .from('timeline_decisions')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('is_current', true)
    .limit(1);

  return decisions?.[0] ?? null;
}

export async function reRankCreativeIdeasForSession(userId: string, sessionId: string) {
  const dbUserId = await resolveUserId(userId);

  const [{ data: ideas, error: ideasError }, destiny, timelineCtx] = await Promise.all([
    supabaseAdmin
      .from('creative_ideas')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('session_id', sessionId)
      .order('score_overall', { ascending: false }),
    getCurrentDestinyContextForUser(userId).catch(() => null),
    getTimelineChoiceContextForUser(userId).catch(() => null),
  ]);

  if (ideasError) {
    console.error('[Creative Cortex] Failed to fetch ideas', ideasError);
    throw ideasError;
  }

  if (!ideas?.length) return;

  const result = await callAIJson<{
    ranking: Array<{ ideaId: string; updatedScores: any; decision?: string }>;
  }>({
    userId,
    feature: 'creative_evaluation',
    systemPrompt: CREATIVE_EVALUATION_PROMPT,
    userPrompt: JSON.stringify({
      ideas: ideas.map((i: any) => ({
        id: i.id,
        title: i.title,
        description: i.description,
        category: i.category,
        scoreOverall: i.score_overall,
        scoreAlignment: i.score_alignment,
        scoreImpact: i.score_impact,
        scoreFeasibility: i.score_feasibility,
      })),
      destiny: destiny ? {
        arc: {
          name: destiny.name,
          logline: destiny.logline,
          focusDomains: destiny.focus_domains,
        },
      } : null,
      timeline: timelineCtx ? {
        label: timelineCtx.label,
        rationale: timelineCtx.rationale,
        seasonStart: timelineCtx.season_start,
        seasonEnd: timelineCtx.season_end,
      } : null,
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Creative Cortex] Failed to evaluate ideas', result.error);
    return;
  }

  const { ranking } = result.data;

  // Update scores for each idea
  for (const rank of ranking) {
    const idea = ideas.find((i: any) => i.id === rank.ideaId);
    if (!idea) continue;

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (rank.updatedScores) {
      if (rank.updatedScores.scoreOverall !== undefined) updates.score_overall = rank.updatedScores.scoreOverall;
      if (rank.updatedScores.scoreAlignment !== undefined) updates.score_alignment = rank.updatedScores.scoreAlignment;
      if (rank.updatedScores.scoreImpact !== undefined) updates.score_impact = rank.updatedScores.scoreImpact;
      if (rank.updatedScores.scoreFeasibility !== undefined) updates.score_feasibility = rank.updatedScores.scoreFeasibility;
      if (rank.updatedScores.scoreEnergyFit !== undefined) updates.score_energy_fit = rank.updatedScores.scoreEnergyFit;
    }

    if (rank.decision) {
      updates.status = rank.decision === 'prioritize' ? 'selected' : rank.decision === 'drop' ? 'discarded' : 'proposed';
      updates.status_reason = rank.decision;
    }

    await supabaseAdmin
      .from('creative_ideas')
      .update(updates)
      .eq('id', rank.ideaId)
      .eq('user_id', dbUserId);

    // Log evaluation
    await supabaseAdmin
      .from('creative_evaluations')
      .insert({
        user_id: dbUserId,
        idea_id: rank.ideaId,
        evaluator: 'destiny_timeline_engine',
        scores: rank.updatedScores ?? {},
        decision: rank.decision ?? null,
      });
  }
}


