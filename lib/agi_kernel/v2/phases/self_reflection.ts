// AGI Kernel v2 - Self-Reflection Phase
// lib/agi_kernel/v2/phases/self_reflection.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { PhaseResult } from '../types';
import { AGI_SELF_REFLECTION_PROMPT } from '../prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function runSelfReflectionPhase(args: {
  userId: string;
  runId: string;
  ctx: any;
  brainContext: any;
}): Promise<PhaseResult> {
  const { userId, runId } = args;
  const dbUserId = await resolveUserId(userId);

  const [{ data: insights }, { data: hypotheses }] = await Promise.all([
    supabaseAdmin
      .from('cognitive_insights')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('run_id', runId),
    supabaseAdmin
      .from('cognitive_hypotheses')
      .select('*')
      .eq('user_id', dbUserId),
  ]);

  const result = await callAIJson<{
    reflections: Array<{
      perspective: 'system' | 'user_centric' | 'meta';
      content: string;
      referencedSubsystems?: string[];
      referencedIssues?: any;
      followupHints?: any;
    }>;
  }>({
    userId,
    feature: 'agi_kernel_self_reflection',
    systemPrompt: AGI_SELF_REFLECTION_PROMPT,
    userPrompt: JSON.stringify({
      insights: insights ?? [],
      hypotheses: hypotheses ?? [],
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[AGI Kernel] Self-reflection phase failed', result.error);
    return {
      status: 'failed',
      errorSummary: result.error ?? 'Failed to generate self-reflection',
    };
  }

  const { reflections } = result.data;

  if (reflections?.length) {
    const rows = reflections.map((r) => ({
      run_id: runId,
      user_id: dbUserId,
      perspective: r.perspective,
      content: r.content,
      referenced_subsystems: r.referencedSubsystems ?? [],
      referenced_issues: r.referencedIssues ?? {},
      followup_hints: r.followupHints ?? {},
    }));

    const { error } = await supabaseAdmin
      .from('cognitive_self_reflections')
      .insert(rows);
    if (error) throw error;
  }

  return {
    status: 'completed',
    data: {
      overallConfidence: 0.9,
      reflectionsCount: reflections?.length ?? 0,
    },
  };
}


