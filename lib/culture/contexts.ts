// Culture Context Registration
// lib/culture/contexts.ts

import { supabaseAdmin } from '@/lib/supabase';
import { CultureContext } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function upsertCultureContext(userId: string, ctx: CultureContext) {
  const dbUserId = await resolveUserId(userId);

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('culture_contexts')
    .select('id')
    .eq('user_id', dbUserId)
    .eq('key', ctx.key)
    .limit(1);

  if (fetchError) {
    console.error('[Culture] Failed to fetch existing context', fetchError);
    throw fetchError;
  }

  if (existing?.[0]) {
    const { error } = await supabaseAdmin
      .from('culture_contexts')
      .update({
        name: ctx.name,
        kind: ctx.kind,
        description: ctx.description ?? null,
        priority: ctx.priority ?? 0.5,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing[0].id);

    if (error) {
      console.error('[Culture] Failed to update context', error);
      throw error;
    }
    return existing[0].id as string;
  }

  const { data, error } = await supabaseAdmin
    .from('culture_contexts')
    .insert({
      user_id: dbUserId,
      key: ctx.key,
      name: ctx.name,
      kind: ctx.kind,
      description: ctx.description ?? null,
      priority: ctx.priority ?? 0.5,
    })
    .select('id');

  if (error) {
    console.error('[Culture] Failed to insert context', error);
    throw error;
  }
  return data?.[0]?.id as string;
}


