// Executive Council Mode v1 - Members Management
// lib/executive_council/v1/members.ts

import { supabaseAdminClient } from '../../supabase/admin';
import { CouncilRoleId } from './types';

const DEFAULT_MEMBERS: { role_id: CouncilRoleId; display_name: string; description: string; weight: number }[] = [
  { role_id: 'strategist',  display_name: 'Strategic Mind',          description: 'Long-term coherence and tradeoffs.', weight: 1.3 },
  { role_id: 'ethnographer',display_name: 'Culture Advisor',         description: 'Organizational and industry norms.', weight: 1.0 },
  { role_id: 'relational',  display_name: 'Relationship Guardian',   description: 'Impact on key relationships.',        weight: 1.2 },
  { role_id: 'financial',   display_name: 'Financial Steward',       description: 'Money, risk, and cash flow.',        weight: 1.1 },
  { role_id: 'health',      display_name: 'Health Sentinel',         description: 'Energy, stress, and burnout risk.',  weight: 1.2 },
  { role_id: 'identity',    display_name: 'Identity Keeper',         description: 'Alignment with who you want to be.', weight: 1.3 },
  { role_id: 'destiny',     display_name: 'Future Architect',        description: 'Long-term trajectory and forks.',     weight: 1.1 },
  { role_id: 'ethics',      display_name: 'Ethical Compass',         description: 'Moral and ethical integrity.',        weight: 1.0 },
];

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function ensureCouncilMembersForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data } = await supabaseAdminClient
    .from('council_members')
    .select('*')
    .eq('user_id', dbUserId);

  if (data && data.length) return data;

  const rows = DEFAULT_MEMBERS.map((m) => ({
    user_id: dbUserId,
    role_id: m.role_id,
    display_name: m.display_name,
    description: m.description,
    weight: m.weight,
    enabled: true,
    config: {},
  }));

  const { data: inserted, error } = await supabaseAdminClient
    .from('council_members')
    .insert(rows)
    .select('*');

  if (error) throw error;
  return inserted ?? [];
}


