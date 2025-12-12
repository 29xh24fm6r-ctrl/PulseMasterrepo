// Culture Context Provider
// lib/culture/context_provider.ts

import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function getCultureContextSnapshot(
  userId: string,
  keys: string[]
) {
  if (!keys.length) return [];

  const dbUserId = await resolveUserId(userId);

  const { data: contexts, error: ctxError } = await supabaseAdmin
    .from('culture_contexts')
    .select('*')
    .eq('user_id', dbUserId)
    .in('key', keys);

  if (ctxError) {
    console.error('[Culture] Failed to fetch contexts', ctxError);
    return [];
  }

  if (!contexts?.length) return [];

  const contextIds = contexts.map((c: any) => c.id);

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('culture_profiles')
    .select('*')
    .eq('user_id', dbUserId)
    .in('context_id', contextIds);

  if (profileError) {
    console.error('[Culture] Failed to fetch profiles', profileError);
    // Continue without profiles
  }

  const byId: Record<string, any> = {};
  for (const p of profiles || []) {
    byId[p.context_id] = p;
  }

  return contexts.map((c: any) => ({
    context: c,
    profile: byId[c.id] ?? null,
  }));
}


