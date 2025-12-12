// Relational State Snapshot Builder (ToM + Social Graph)
// lib/relational_mind/state.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { TheoryOfMindSnapshot } from './types';
import { RELATIONAL_STATE_PROMPT } from './prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function refreshRelationalStateForIdentity(
  userId: string,
  relationalIdentityId: string,
  now: Date
) {
  const dbUserId = await resolveUserId(userId);

  // Load identity and recent interactions
  const [{ data: idRows }, { data: interactionEvents }] = await Promise.all([
    supabaseAdmin
      .from('relational_identities')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('id', relationalIdentityId)
      .limit(1),
    // For now, we'll use a placeholder for interaction_events
    // In production, this would query emails, calls, messages, meetings, etc.
    Promise.resolve({ data: [] }),
  ]);

  const identity = idRows?.[0];
  if (!identity) return null;

  const result = await callAIJson<{ snapshot: TheoryOfMindSnapshot }>({
    userId,
    feature: 'relational_mind_state',
    systemPrompt: RELATIONAL_STATE_PROMPT,
    userPrompt: JSON.stringify({
      identity,
      interactionEvents: interactionEvents ?? [],
      now: now.toISOString(),
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Relational Mind] Failed to generate state snapshot', result.error);
    return null;
  }

  const { snapshot } = result.data;

  const { data, error } = await supabaseAdmin
    .from('relational_state_snapshots')
    .insert({
      user_id: dbUserId,
      relational_identity_id: relationalIdentityId,
      snapshot_time: now.toISOString(),
      relationship_health: snapshot?.perceivedState?.relationshipHealth ?? null,
      trust_level: snapshot?.perceivedState?.trustLevel ?? null,
      tension_level: snapshot?.perceivedState?.tensionLevel ?? null,
      connection_frequency: snapshot?.perceivedState?.connectionFrequency ?? null,
      reciprocity_score: snapshot?.perceivedState?.reciprocityScore ?? null,
      current_mode: snapshot?.perceivedState?.mode ?? null,
      recent_events: snapshot?.perceivedState?.recentEvents ?? {},
      perceived_other_state: snapshot?.perceivedState?.other ?? {},
      risk_flags: snapshot?.riskFlags ?? {},
      opportunity_flags: snapshot?.opportunityFlags ?? {},
    })
    .select('id');

  if (error) throw error;

  const snapshotId = data?.[0]?.id as string;

  // Update identity's last_model_update_at
  await supabaseAdmin
    .from('relational_identities')
    .update({
      last_model_update_at: now.toISOString(),
    })
    .eq('id', relationalIdentityId);

  return snapshotId;
}


