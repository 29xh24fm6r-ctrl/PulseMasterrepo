// Deals Adapter - Sync deals to graph
// lib/thirdbrain/graph/adapters/deals_adapter.ts

import { supabaseAdmin } from '@/lib/supabase';
import { createNode, getNodeBySource } from '../service';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function syncDealToGraph(userId: string, dealId: string): Promise<void> {
  const dbUserId = await resolveUserId(userId);

  // Get deal data
  const { data: deal } = await supabaseAdmin
    .from('deals')
    .select('*, banking_deal_profiles(*)')
    .eq('id', dealId)
    .single();

  if (!deal) return;

  const profile = (deal as any).banking_deal_profiles?.[0];

  // Check if node exists
  let existingNode = await getNodeBySource(userId, 'deals', dealId);
  if (existingNode) {
    return; // Already synced
  }

  // Create deal node
  await createNode({
    userId,
    type: 'deal',
    sourceTable: 'deals',
    sourceId: dealId,
    props: {
      name: deal.name,
      status: deal.status,
      facility_type: profile?.facility_type,
      requested_amount: profile?.requested_amount,
      dscr: profile?.dscr,
      ltv: profile?.ltv,
    },
    startedAt: deal.created_at,
  });
}


