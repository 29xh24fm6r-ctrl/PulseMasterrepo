// Social Entities Management
// lib/social/v2/entities.ts

import { supabaseAdmin } from '@/lib/supabase';
import { SocialEntityInput } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function upsertSocialEntity(input: SocialEntityInput) {
  const dbUserId = await resolveUserId(input.userId);
  const { source, externalId, kind, displayName, roleLabel, importance, tags } = input;

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('social_entities')
    .select('id')
    .eq('user_id', dbUserId)
    .eq('source', source)
    .eq('external_id', externalId ?? '')
    .limit(1);

  if (fetchError) {
    console.error('[Social] Failed to fetch existing entity', fetchError);
    throw fetchError;
  }

  if (existing?.[0]) {
    const { error: updateError } = await supabaseAdmin
      .from('social_entities')
      .update({
        kind,
        display_name: displayName,
        role_label: roleLabel ?? null,
        importance: importance ?? null,
        tags: tags ?? [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing[0].id);

    if (updateError) {
      console.error('[Social] Failed to update entity', updateError);
      throw updateError;
    }
    return existing[0].id as string;
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('social_entities')
    .insert({
      user_id: dbUserId,
      source,
      external_id: externalId ?? null,
      kind,
      display_name: displayName,
      role_label: roleLabel ?? null,
      importance: importance ?? null,
      tags: tags ?? [],
    })
    .select('id');

  if (insertError) {
    console.error('[Social] Failed to insert entity', insertError);
    throw insertError;
  }
  return inserted?.[0]?.id as string;
}


