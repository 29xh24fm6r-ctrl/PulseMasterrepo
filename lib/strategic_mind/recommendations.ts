// Strategic Mind - Strategy Recommendations Generator
// lib/strategic_mind/recommendations.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { aggregateSubsystemSignalsForUser } from './aggregate';
import { STRATEGIC_RECOMMENDATIONS_PROMPT } from './prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function generateStrategyRecommendations(userId: string, now: Date) {
  const dbUserId = await resolveUserId(userId);

  // Get latest snapshot, conflicts, and equilibrium
  const [
    { data: latestSnapshot },
    { data: recentConflicts },
    { data: latestEquilibrium },
  ] = await Promise.all([
    supabaseAdmin
      .from('strategic_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('strategic_conflicts')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('strategic_equilibria')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  if (!latestSnapshot?.[0]) {
    console.warn('[Strategic Mind] No snapshot found for recommendations');
    return [];
  }

  // Aggregate current signals
  const signals = await aggregateSubsystemSignalsForUser(userId, now);

  const result = await callAIJson<{
    recommendations: Array<{
      title: string;
      description: string;
      timescale: string;
      priority: number;
      context: any;
      recommendedActions: any[];
    }>;
  }>({
    userId,
    feature: 'strategic_mind_recommendations',
    systemPrompt: STRATEGIC_RECOMMENDATIONS_PROMPT,
    userPrompt: JSON.stringify({
      snapshot: latestSnapshot[0],
      conflicts: recentConflicts ?? [],
      equilibrium: latestEquilibrium?.[0] ?? null,
      signals,
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

  // Store recommendations
  const rows = recommendations.map((r) => ({
    user_id: dbUserId,
    title: r.title,
    description: r.description,
    timescale: r.timescale,
    priority: r.priority ?? 0.5,
    context: r.context ?? {},
    recommended_actions: r.recommendedActions ?? [],
  }));

  const { error } = await supabaseAdmin
    .from('strategy_recommendations')
    .insert(rows);

  if (error) throw error;

  return recommendations;
}


