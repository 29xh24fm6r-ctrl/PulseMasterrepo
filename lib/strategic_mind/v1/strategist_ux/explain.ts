// Meet the Strategist UX - Explanation Builder
// lib/strategic_mind/v1/strategist_ux/explain.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { STRATEGIC_EXPLAINER_PROMPT, STRATEGIC_QA_PROMPT } from './prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function buildStrategicExplanation(userId: string) {
  const dbUserId = await resolveUserId(userId);

  // Get latest strategic context
  const [snapshotRes, equilibriumRes, conflictsRes, recsRes] = await Promise.all([
    supabaseAdmin
      .from('strategic_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('strategic_equilibria')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('strategic_conflicts')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('strategy_recommendations')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const snapshot = snapshotRes.data?.[0] ?? null;
  const equilibrium = equilibriumRes.data?.[0] ?? null;
  const conflicts = conflictsRes.data ?? [];
  const recommendations = recsRes.data ?? [];

  const result = await callAIJson<{
    explanation: {
      introNarrative: string;
      keyPoints: Array<{
        label: string;
        summary: string;
        timescale: string;
        importance: number;
        scope: string;
      }>;
    };
  }>({
    userId,
    feature: 'strategist_explanation',
    systemPrompt: STRATEGIC_EXPLAINER_PROMPT,
    userPrompt: JSON.stringify({
      snapshot,
      equilibrium,
      conflicts,
      recommendations,
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Strategist UX] Failed to build explanation', result.error);
    return {
      snapshot,
      equilibrium,
      conflicts,
      recommendations,
      introNarrative: '',
      keyPoints: [],
    };
  }

  const { explanation } = result.data;

  return {
    snapshot,
    equilibrium,
    conflicts,
    recommendations,
    introNarrative: explanation?.introNarrative ?? '',
    keyPoints: explanation?.keyPoints ?? [],
  };
}

export async function answerStrategistQuestion(
  userId: string,
  question: string
): Promise<string> {
  const dbUserId = await resolveUserId(userId);

  const [snapshotRes, equilibriumRes, conflictsRes, recsRes] = await Promise.all([
    supabaseAdmin
      .from('strategic_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('strategic_equilibria')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('strategic_conflicts')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('strategy_recommendations')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const snapshot = snapshotRes.data?.[0] ?? null;
  const equilibrium = equilibriumRes.data?.[0] ?? null;
  const conflicts = conflictsRes.data ?? [];
  const recommendations = recsRes.data ?? [];

  const result = await callAIJson<{ answer: string }>({
    userId,
    feature: 'strategist_qa',
    systemPrompt: STRATEGIC_QA_PROMPT,
    userPrompt: JSON.stringify({
      snapshot,
      equilibrium,
      conflicts,
      recommendations,
      question,
    }, null, 2),
    maxTokens: 1000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Strategist UX] Failed to answer question', result.error);
    return 'I apologize, but I encountered an error while processing your question. Please try again.';
  }

  return result.data.answer ?? '';
}


