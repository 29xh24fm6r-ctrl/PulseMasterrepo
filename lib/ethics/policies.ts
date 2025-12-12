// Ethical Policies System
// lib/ethics/policies.ts

import { supabaseAdmin } from '@/lib/supabase';
import { EthicalPolicy } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function getApplicablePolicies(params: {
  userId: string;
  domain?: string | null;
}): Promise<EthicalPolicy[]> {
  const dbUserId = await resolveUserId(params.userId);
  const { domain } = params;

  const { data, error } = await supabaseAdmin
    .from('ethical_policies')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${dbUserId}`) // system or user-specific
    .eq('is_active', true);

  if (error) {
    console.error('[Ethics] Failed to fetch policies', error);
    throw error;
  }

  // Filter by domain for v1 (naive filtering)
  let filtered = (data || []) as any[];
  if (domain) {
    filtered = filtered.filter((p) => !p.domain || p.domain === domain || p.domain === 'general');
  }

  // Sort by priority (smaller = higher priority)
  filtered.sort((a, b) => a.priority - b.priority);

  return filtered.map((p) => ({
    userId: p.user_id,
    scope: p.scope,
    domain: p.domain,
    key: p.key,
    name: p.name,
    description: p.description,
    priority: p.priority,
    isActive: p.is_active,
    rule: p.rule,
  }));
}


