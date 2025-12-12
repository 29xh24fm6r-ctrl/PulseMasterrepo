// Relational Mind Context Reader
// lib/relational_mind/context_read.ts

import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function getLatestRelationalStateForIdentity(
  userId: string,
  relationalIdentityId: string
) {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('relational_state_snapshots')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('relational_identity_id', relationalIdentityId)
    .order('snapshot_time', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getRelationshipHighlightsForUser(
  userId: string,
  limit: number = 20
) {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('relationship_highlights')
    .select('*')
    .eq('user_id', dbUserId)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}


