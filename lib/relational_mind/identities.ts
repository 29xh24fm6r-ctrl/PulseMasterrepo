// Relational Identity Management
// lib/relational_mind/identities.ts

import { supabaseAdmin } from '@/lib/supabase';
import { RelationalIdentityInput } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function getOrCreateRelationalIdentity(
  userId: string,
  input: RelationalIdentityInput
): Promise<string> {
  const dbUserId = await resolveUserId(userId);

  // Try to find existing identity by contactId, externalRef, or displayName
  let existing: any = null;

  if (input.contactId) {
    const { data } = await supabaseAdmin
      .from('relational_identities')
      .select('id')
      .eq('user_id', dbUserId)
      .eq('contact_id', input.contactId)
      .limit(1);
    existing = data?.[0] ?? null;
  }

  if (!existing && input.externalRef) {
    const { data } = await supabaseAdmin
      .from('relational_identities')
      .select('id')
      .eq('user_id', dbUserId)
      .eq('external_ref', input.externalRef)
      .limit(1);
    existing = data?.[0] ?? null;
  }

  if (!existing && input.displayName) {
    const { data } = await supabaseAdmin
      .from('relational_identities')
      .select('id')
      .eq('user_id', dbUserId)
      .eq('display_name', input.displayName)
      .limit(1);
    existing = data?.[0] ?? null;
  }

  if (existing?.id) return existing.id as string;

  // Create new identity
  const { data, error } = await supabaseAdmin
    .from('relational_identities')
    .insert({
      user_id: dbUserId,
      contact_id: input.contactId ?? null,
      external_ref: input.externalRef ?? null,
      display_name: input.displayName,
      role: input.role ?? null,
      domain: input.domain ?? null,
    })
    .select('id');

  if (error) throw error;
  return data?.[0]?.id as string;
}

export async function getKeyRelationalIdentitiesForUser(
  userId: string,
  limit: number = 10
): Promise<Array<{ id: string; importance: number; closeness: number }>> {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('relational_identities')
    .select('id, importance, closeness')
    .eq('user_id', dbUserId)
    .order('importance', { ascending: false })
    .order('closeness', { ascending: false })
    .limit(limit);

  if (error) throw error;

  // Two-step sort: push nulls to end, preserve original order otherwise
  const sorted = (data ?? []).sort((a: any, b: any) => {
    // First sort by importance (nulls last)
    if (a.importance == null && b.importance != null) return 1;
    if (a.importance != null && b.importance == null) return -1;
    if (a.importance != null && b.importance != null) {
      if (b.importance !== a.importance) return b.importance - a.importance;
    }
    // Then by closeness (nulls last)
    if (a.closeness == null && b.closeness != null) return 1;
    if (a.closeness != null && b.closeness == null) return -1;
    if (a.closeness != null && b.closeness != null) {
      return b.closeness - a.closeness;
    }
    return 0;
  });

  return sorted.map((r: any) => ({
    id: r.id,
    importance: r.importance ?? 0.5,
    closeness: r.closeness ?? 0.5,
  }));
}
