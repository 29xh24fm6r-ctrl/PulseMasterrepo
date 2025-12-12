// Simulation Policy Management
// lib/simulation/v2/policies.ts

import { supabaseAdmin } from '@/lib/supabase';
import { SimulationPolicy } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function getSimulationPoliciesForUser(userId: string): Promise<SimulationPolicy[]> {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('simulation_policies')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${dbUserId}`);

  if (error) {
    console.error('[Simulation v2] Failed to fetch policies', error);
    throw error;
  }

  return (data || []).map((row) => ({
    key: row.key,
    name: row.name,
    description: row.description ?? undefined,
    domain: row.domain ?? undefined,
    policySpec: row.policy_spec ?? {},
  }));
}


