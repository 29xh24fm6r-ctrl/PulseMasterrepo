// AGI Kernel v2 - Memory Sweep Phase
// lib/agi_kernel/v2/phases/memory_sweep.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { PhaseResult } from '../types';
import { AGI_MEMORY_SWEEP_PROMPT } from '../prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function runMemorySweepPhase(args: {
  userId: string;
  runId: string;
  ctx: any;
  brainContext: any;
}): Promise<PhaseResult> {
  const { userId, runId, ctx } = args;
  const dbUserId = await resolveUserId(userId);
  const now = ctx.now;

  // Fetch recent raw events: tasks, notes, interactions, logs, etc.
  const since = new Date(now.getTime() - 24 * 3600000).toISOString();

  const [
    emotions,
    somatic,
  ] = await Promise.all([
    supabaseAdmin
      .from('emotion_state_daily')
      .select('*')
      .eq('user_id', dbUserId)
      .gte('date', since.slice(0, 10)),
    supabaseAdmin
      .from('somatic_state_daily')
      .select('*')
      .eq('user_id', dbUserId)
      .gte('date', since.slice(0, 10)),
  ]);

  // For now, we'll use a simplified event set
  // In production, this would query actual raw_events, tasks, interactions, etc.
  const events: any[] = [];

  const result = await callAIJson<{
    summary: {
      memoryChunks: any[];
      keyMoments: any[];
      unresolvedThreads: any[];
      overallConfidence: number;
    };
  }>({
    userId,
    feature: 'agi_kernel_memory_sweep',
    systemPrompt: AGI_MEMORY_SWEEP_PROMPT,
    userPrompt: JSON.stringify({
      runId,
      events: events ?? [],
      emotions: emotions?.data ?? [],
      somatic: somatic?.data ?? [],
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[AGI Kernel] Memory sweep phase failed', result.error);
    return {
      status: 'failed',
      errorSummary: result.error ?? 'Failed to generate memory sweep',
    };
  }

  const { summary } = result.data;

  // Persist keyMoments as insights
  if (summary?.keyMoments?.length) {
    const insightRows = summary.keyMoments.map((m: any) => ({
      run_id: runId,
      user_id: dbUserId,
      source_phase: 'memory_sweep',
      category: 'pattern',
      label: m.label ?? 'Key moment',
      description: m.description ?? '',
      importance: m.importance ?? 0.6,
      confidence: m.confidence ?? 0.7,
      scope: m.scope ?? 'meta',
      related_entities: m.relatedEntities ?? {},
      recommended_actions: m.recommendedActions ?? {},
    }));

    const { error } = await supabaseAdmin
      .from('cognitive_insights')
      .insert(insightRows);

    if (error) throw error;
  }

  return {
    status: 'completed',
    data: {
      overallConfidence: summary?.overallConfidence ?? 0.8,
      unresolvedThreads: summary?.unresolvedThreads ?? [],
    },
  };
}


