// Social Edges Management
// lib/social/v2/edges.ts

import { supabaseAdmin } from '@/lib/supabase';
import { SocialEdgeState } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function upsertSocialEdge(
  userId: string,
  fromEntityId: string,
  toEntityId: string,
  state: SocialEdgeState
) {
  const dbUserId = await resolveUserId(userId);

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('social_edges')
    .select('id')
    .eq('user_id', dbUserId)
    .eq('from_entity_id', fromEntityId)
    .eq('to_entity_id', toEntityId)
    .limit(1);

  if (fetchError) {
    console.error('[Social] Failed to fetch existing edge', fetchError);
    throw fetchError;
  }

  const payload: any = {
    relationship_type: state.relationshipType ?? null,
    direction: state.direction ?? null,
    closeness: state.closeness ?? null,
    trust: state.trust ?? null,
    tension: state.tension ?? null,
    drift: state.drift ?? null,
    supportiveness: state.supportiveness ?? null,
    metrics: state.metrics ?? {},
    updated_at: new Date().toISOString(),
  };

  if (existing?.[0]) {
    const { error: updateError } = await supabaseAdmin
      .from('social_edges')
      .update(payload)
      .eq('id', existing[0].id);

    if (updateError) {
      console.error('[Social] Failed to update edge', updateError);
      throw updateError;
    }
    return existing[0].id as string;
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('social_edges')
    .insert({
      user_id: dbUserId,
      from_entity_id: fromEntityId,
      to_entity_id: toEntityId,
      ...payload,
    })
    .select('id');

  if (insertError) {
    console.error('[Social] Failed to insert edge', insertError);
    throw insertError;
  }
  return inserted?.[0]?.id as string;
}


