// Mythic Coach v1 - Focus Builder
// lib/mythic_coach/v1/focus_builder.ts

import { supabaseAdminClient } from '../../supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { MYTHIC_FOCUS_PROMPT } from './prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function buildMythicTrainingFocus(userId: string, now: Date) {
  const dbUserId = await resolveUserId(userId);

  const [canonSnapshotRes, archetypeSnapshotRes, strategicSnapshotRes] = await Promise.all([
    supabaseAdminClient
      .from('life_canon_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdminClient
      .from('archetype_snapshots')
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
  const archetypeSnapshot = archetypeSnapshotRes.data;
  const strategicSnapshot = strategicSnapshotRes.data;

  const result = await callAIJson<{
    primaryTargets: Array<{
      archetypeId: string;
      mode: 'grow' | 'stabilize' | 'cool';
      reason: string;
    }>;
    secondaryTargets: Array<{
      archetypeId: string;
      mode: 'grow' | 'stabilize' | 'cool';
      reason: string;
    }>;
    rationale: string;
  }>({
    userId,
    feature: 'mythic_focus',
    systemPrompt: MYTHIC_FOCUS_PROMPT,
    userPrompt: `Context:\n${JSON.stringify({
      canonSnapshot,
      archetypeSnapshot,
      strategicSnapshot,
    }, null, 2)}`,
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    throw new Error(`Failed to build mythic focus: ${result.error}`);
  }

  const { primaryTargets, secondaryTargets, rationale } = result.data;

  const { data, error } = await supabaseAdminClient
    .from('mythic_training_focus')
    .insert({
      user_id: dbUserId,
      primary_targets: primaryTargets ?? [],
      secondary_targets: secondaryTargets ?? [],
      rationale: rationale ?? '',
      linked_chapter_id: canonSnapshot?.active_chapter?.id ?? null,
      linked_snapshot_id: canonSnapshot?.id ?? null,
      linked_archetype_snapshot_id: archetypeSnapshot?.id ?? null,
    })
    .select('id');

  if (error) throw error;

  return {
    focusId: data?.[0]?.id as string,
    primaryTargets: primaryTargets ?? [],
    secondaryTargets: secondaryTargets ?? [],
    rationale: rationale ?? '',
  };
}


