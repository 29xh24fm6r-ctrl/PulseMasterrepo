// Relationship Highlights Generator
// lib/relational_mind/highlights.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { RELATIONSHIP_HIGHLIGHTS_PROMPT } from './prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function refreshRelationshipHighlightsForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const [{ data: identities }, { data: latestStates }] = await Promise.all([
    supabaseAdmin
      .from('relational_identities')
      .select('*')
      .eq('user_id', dbUserId),
    supabaseAdmin
      .from('relational_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false }),
  ]);

  // Group states by identity (get latest for each)
  const statesByIdentity: Record<string, any> = {};
  for (const state of latestStates ?? []) {
    const id = state.relational_identity_id;
    if (!statesByIdentity[id]) {
      statesByIdentity[id] = state;
    }
  }

  const result = await callAIJson<{
    highlights: Array<{
      relationalIdentityId?: string;
      kind: string;
      label: string;
      description: string;
      importance: number;
      suggestedAction?: any;
    }>;
  }>({
    userId,
    feature: 'relational_mind_highlights',
    systemPrompt: RELATIONSHIP_HIGHLIGHTS_PROMPT,
    userPrompt: JSON.stringify({
      identities: identities ?? [],
      latestStates: Object.values(statesByIdentity),
    }, null, 2),
    maxTokens: 4000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Relational Mind] Failed to generate highlights', result.error);
    return;
  }

  const { highlights } = result.data;

  if (!highlights?.length) return;

  const rows = highlights.map((h) => ({
    user_id: dbUserId,
    relational_identity_id: h.relationalIdentityId ?? null,
    kind: h.kind,
    label: h.label,
    description: h.description,
    importance: h.importance ?? 0.5,
    suggested_action: h.suggestedAction ?? {},
  }));

  const { error } = await supabaseAdmin
    .from('relationship_highlights')
    .insert(rows);

  if (error) throw error;
}


