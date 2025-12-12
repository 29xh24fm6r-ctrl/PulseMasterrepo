// Mythic Coach v1 - Plan Builder
// lib/mythic_coach/v1/plan_builder.ts

import { supabaseAdminClient } from '../../supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { MYTHIC_PLAN_PROMPT } from './prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function createMythicPlanForTarget(
  userId: string,
  target: { archetypeId: string; mode: 'grow' | 'stabilize' | 'cool' },
  durationDays: number,
  now: Date
) {
  const dbUserId = await resolveUserId(userId);

  const [canonSnapshotRes, strategicSnapshotRes] = await Promise.all([
    supabaseAdminClient
      .from('life_canon_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdminClient
      .from('strategic_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const canonSnapshot = canonSnapshotRes.data;
  const strategicSnapshot = strategicSnapshotRes.data;

  const result = await callAIJson<{
    planLabel: string;
    description: string;
    goals: string[];
    constraints: string[];
  }>({
    userId,
    feature: 'mythic_plan',
    systemPrompt: MYTHIC_PLAN_PROMPT,
    userPrompt: `Context:\n${JSON.stringify({
      archetypeId: target.archetypeId,
      mode: target.mode,
      durationDays,
      canonSnapshot,
      strategicSnapshot,
    }, null, 2)}`,
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    throw new Error(`Failed to create mythic plan: ${result.error}`);
  }

  const { planLabel, description, goals, constraints } = result.data;

  const expectedEnd = new Date(now);
  expectedEnd.setDate(expectedEnd.getDate() + durationDays);

  const { data, error } = await supabaseAdminClient
    .from('mythic_training_plans')
    .insert({
      user_id: dbUserId,
      archetype_id: target.archetypeId,
      plan_label: planLabel ?? `${target.archetypeId.toUpperCase()} ${durationDays}-Day Arc`,
      description: description ?? '',
      duration_days: durationDays,
      intensity: 'moderate',
      goals: goals ?? [],
      constraints: constraints ?? [],
      status: 'active',
      progress: {
        startedAt: now.toISOString(),
        expectedEnd: expectedEnd.toISOString(),
        percentComplete: 0,
      },
    })
    .select('id');

  if (error) throw error;

  return data?.[0]?.id as string;
}


