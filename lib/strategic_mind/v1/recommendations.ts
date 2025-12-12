// Strategic Mind v1 - Strategy Recommendations Generator
// lib/strategic_mind/v1/recommendations.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { StrategicSignalBundle, StrategyRecommendation } from './types';
import { STRATEGY_RECOMMENDATIONS_PROMPT } from './prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function generateStrategyRecommendations(
  userId: string,
  bundle: StrategicSignalBundle,
  equilibrium: any,
  conflicts: any[]
): Promise<StrategyRecommendation[]> {
  const dbUserId = await resolveUserId(userId);

  const result = await callAIJson<{
    recommendations: StrategyRecommendation[];
  }>({
    userId,
    feature: 'strategic_mind_recommendations',
    systemPrompt: STRATEGY_RECOMMENDATIONS_PROMPT,
    userPrompt: JSON.stringify({
      goalHierarchy: bundle.goals,
      strategicEquilibrium: equilibrium,
      conflicts,
      forecast: bundle.forecast,
      hypotheses: bundle.hypotheses,
      insights: bundle.insights,
    }, null, 2),
    maxTokens: 4000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Strategic Mind] Failed to generate recommendations', result.error);
    return [];
  }

  const { recommendations } = result.data;

  if (!recommendations?.length) return [];

  const rows = recommendations.map((r) => ({
    user_id: dbUserId,
    title: r.title,
    description: r.description,
    timescale: r.timescale,
    priority: r.priority ?? 0.5,
    scope: r.scope ?? 'mixed',
    context: r.context ?? {},
    recommended_actions: r.recommendedActions ?? [],
  }));

  const { error } = await supabaseAdmin
    .from('strategy_recommendations')
    .insert(rows);

  if (error) throw error;

  return recommendations;
}


