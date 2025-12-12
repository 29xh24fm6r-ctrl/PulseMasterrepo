// Creative Pattern Learning
// lib/creative/v2/patterns.ts

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

const CREATIVE_PATTERNS_PROMPT = `
You are the Creative Meta-Learner.

You see:
- All creative_ideas for this user.
- creative_evaluations: what was prioritized, implemented, dropped, and how it performed.

Your job:
1. Identify 3–10 creative_patterns that describe:
   - What tends to work for this user.
   - What tends to fail.

2. For each pattern:
   - patternKey, description.
   - characteristics: features of good ideas in this pattern.
   - antiPatterns: warning signs of bad ideas.
   - recommendations: how future idea generation should lean or avoid.

Return JSON: { "patterns": [ ... ] }.

Only return valid JSON.`;

export async function refreshCreativePatternsForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const [{ data: ideas, error: ideasError }, { data: evaluations, error: evalError }] = await Promise.all([
    supabaseAdmin
      .from('creative_ideas')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(200),
    supabaseAdmin
      .from('creative_evaluations')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  if (ideasError) {
    console.error('[Creative Cortex] Failed to fetch ideas', ideasError);
    throw ideasError;
  }

  if (evalError) {
    console.error('[Creative Cortex] Failed to fetch evaluations', evalError);
    throw evalError;
  }

  if (!ideas?.length) {
    console.warn('[Creative Cortex] No ideas found for pattern learning');
    return;
  }

  const result = await callAIJson<{
    patterns: Array<{
      patternKey: string;
      description: string;
      characteristics: any;
      antiPatterns: any;
      recommendations: any;
    }>;
  }>({
    userId,
    feature: 'creative_patterns',
    systemPrompt: CREATIVE_PATTERNS_PROMPT,
    userPrompt: JSON.stringify({
      ideas: (ideas || []).slice(0, 100).map((i: any) => ({
        title: i.title,
        description: i.description,
        category: i.category,
        status: i.status,
        scoreOverall: i.score_overall,
        scoreAlignment: i.score_alignment,
        scoreImpact: i.score_impact,
        scoreFeasibility: i.score_feasibility,
      })),
      evaluations: (evaluations || []).slice(0, 50).map((e: any) => ({
        ideaId: e.idea_id,
        evaluator: e.evaluator,
        scores: e.scores || {},
        decision: e.decision,
        comments: e.comments,
      })),
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data || !result.data.patterns?.length) {
    console.error('[Creative Cortex] Failed to generate patterns', result.error);
    return;
  }

  const { patterns } = result.data;

  const rows = patterns.map((p) => ({
    user_id: dbUserId,
    pattern_key: p.patternKey,
    description: p.description ?? null,
    characteristics: p.characteristics ?? {},
    anti_patterns: p.antiPatterns ?? {},
    recommendations: p.recommendations ?? {},
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin
    .from('creative_patterns')
    .upsert(rows, { onConflict: 'user_id,pattern_key' });

  if (error) {
    console.error('[Creative Cortex] Failed to upsert patterns', error);
    throw error;
  }
}


