// Self Mirror Delta Builder
// lib/self_mirror/delta.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { SelfMirrorDelta } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const SELF_MIRROR_DELTA_PROMPT = `
You are the Self Evolution Narrator.

You see:
- Two self_mirror_snapshots: 'from' (past) and 'to' (recent).

Your job:
1. Describe how the user is changing across:
   - alignment (toward/away from identity/destiny/values),
   - drift,
   - self-compassion,
   - identity emphasis,
   - behavior, emotional, relational, and somatic patterns.

2. Quantify:
   - alignmentChange (-1..1)
   - driftChange (-1..1)
   - selfCompassionChange (-1..1)

3. Provide:
   - identityShifts, behaviorShifts, emotionalShifts, relationalShifts, somaticShifts.
   - summary: short story of how they've been evolving.
   - keyQuestions: 3–7 good reflection questions for them or a coach.

Return JSON: { "delta": { ... } }.

Only return valid JSON.`;

export async function createSelfMirrorDeltaForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data: snapshots, error } = await supabaseAdmin
    .from('self_mirror_snapshots')
    .select('*')
    .eq('user_id', dbUserId)
    .order('snapshot_date', { ascending: false })
    .limit(2);

  if (error) {
    console.error('[Self Mirror] Failed to fetch snapshots', error);
    throw error;
  }

  if (!snapshots || snapshots.length < 2) {
    console.warn('[Self Mirror] Not enough snapshots for delta', snapshots?.length);
    return;
  }

  const [latest, previous] = snapshots;

  const result = await callAIJson<{ delta: SelfMirrorDelta }>({
    userId,
    feature: 'self_mirror_delta',
    systemPrompt: SELF_MIRROR_DELTA_PROMPT,
    userPrompt: JSON.stringify({
      from: {
        snapshotDate: previous.snapshot_date,
        identityState: previous.identity_state,
        destinyState: previous.destiny_state,
        overallAlignment: previous.overall_alignment,
        driftScore: previous.drift_score,
        selfCompassionScore: previous.self_compassion_score,
        behaviorProfile: previous.behavior_profile,
        emotionalProfile: previous.emotional_profile,
        relationalProfile: previous.relational_profile,
        somaticProfile: previous.somatic_profile,
      },
      to: {
        snapshotDate: latest.snapshot_date,
        identityState: latest.identity_state,
        destinyState: latest.destiny_state,
        overallAlignment: latest.overall_alignment,
        driftScore: latest.drift_score,
        selfCompassionScore: latest.self_compassion_score,
        behaviorProfile: latest.behavior_profile,
        emotionalProfile: latest.emotional_profile,
        relationalProfile: latest.relational_profile,
        somaticProfile: latest.somatic_profile,
      },
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Self Mirror] Failed to generate delta', result.error);
    return;
  }

  const { delta } = result.data;

  const { data, error: insertError } = await supabaseAdmin
    .from('self_mirror_deltas')
    .insert({
      user_id: dbUserId,
      from_snapshot_id: previous.id,
      to_snapshot_id: latest.id,
      period_start: previous.snapshot_date,
      period_end: latest.snapshot_date,
      alignment_change: delta.alignmentChange,
      drift_change: delta.driftChange,
      self_compassion_change: delta.selfCompassionChange,
      identity_shifts: delta.identityShifts ?? {},
      behavior_shifts: delta.behaviorShifts ?? {},
      emotional_shifts: delta.emotionalShifts ?? {},
      relational_shifts: delta.relationalShifts ?? {},
      somatic_shifts: delta.somaticShifts ?? {},
      summary: delta.summary ?? null,
      key_questions: delta.keyQuestions ?? {},
    })
    .select('id');

  if (insertError) {
    console.error('[Self Mirror] Failed to insert delta', insertError);
    throw insertError;
  }
  return data?.[0]?.id as string;
}


