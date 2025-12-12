// Calls Adapter - Sync calls to graph
// lib/thirdbrain/graph/adapters/calls_adapter.ts

import { supabaseAdmin } from '@/lib/supabase';
import { createNode, linkNodes, getNodeBySource } from '../service';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function syncCallToGraph(userId: string, callId: string): Promise<void> {
  const dbUserId = await resolveUserId(userId);

  // Get call data
  const { data: call } = await supabaseAdmin
    .from('call_sessions')
    .select('*, call_summaries(*)')
    .eq('id', callId)
    .single();

  if (!call) return;

  const summary = (call as any).call_summaries?.[0];

  // Check if node already exists
  let existingNode = await getNodeBySource(userId, 'call_sessions', callId);
  let nodeId: string;

  if (existingNode) {
    nodeId = existingNode.id;
  } else {
    // Create call node
    nodeId = await createNode({
      userId,
      type: 'call',
      sourceTable: 'call_sessions',
      sourceId: callId,
      props: {
        direction: call.direction,
        from_number: call.from_number,
        to_number: call.to_number,
        summary: summary?.high_level_summary || '',
        duration: call.ended_at && call.started_at
          ? new Date(call.ended_at).getTime() - new Date(call.started_at).getTime()
          : null,
      },
      startedAt: call.started_at,
      endedAt: call.ended_at,
    });
  }

  // Link to deals if mentioned in summary
  if (summary?.entities) {
    for (const entity of summary.entities || []) {
      if (entity.type === 'deal' && entity.name) {
        // Find deal node
        const { data: deals } = await supabaseAdmin
          .from('deals')
          .select('id')
          .eq('user_id', dbUserId)
          .ilike('name', `%${entity.name}%`)
          .limit(1);

        if (deals && deals.length > 0) {
          const dealNode = await getNodeBySource(userId, 'deals', deals[0].id);
          if (dealNode) {
            await linkNodes(userId, nodeId, dealNode.id, 'related_to', 0.8);
          }
        }
      }
    }
  }
}


