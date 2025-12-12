// Social Nodes Builder
// lib/social/nodes.ts

import { supabaseAdmin } from '@/lib/supabase';
import { getImportantContactIdsForUser } from '@/lib/desire/engine';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

async function getContactsWithRelationshipStats(userId: string): Promise<any[]> {
  const dbUserId = await resolveUserId(userId);

  // Get contacts with relationship info
  const { data: contacts } = await supabaseAdmin
    .from('contacts')
    .select('*')
    .eq('user_id', dbUserId)
    .limit(100);

  // Get last interaction times from calls
  const contactIds = (contacts || []).map((c: any) => c.id);
  
  const lastInteractions: Record<string, string> = {};
  if (contactIds.length > 0) {
    const { data: calls } = await supabaseAdmin
      .from('call_sessions')
      .select('id, started_at, participants')
      .eq('user_id', dbUserId)
      .order('started_at', { ascending: false })
      .limit(100);

    (calls || []).forEach((call: any) => {
      const participants = call.participants || [];
      participants.forEach((p: any) => {
        if (p.contact_id && !lastInteractions[p.contact_id]) {
          lastInteractions[p.contact_id] = call.started_at;
        }
      });
    });
  }

  return (contacts || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    roles: c.roles || [],
    importance_score: c.is_important ? 0.8 : 0.5,
    last_interaction_at: lastInteractions[c.id] || null,
  }));
}

export async function refreshSocialNodesForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  // 1. Ensure self node
  const selfNode = {
    user_id: dbUserId,
    node_type: 'self',
    node_id: dbUserId,
    label: 'You',
    roles: ['self'],
    importance_score: 1,
    updated_at: new Date().toISOString(),
  };

  await supabaseAdmin
    .from('social_nodes')
    .upsert(selfNode, { onConflict: 'user_id,node_type,node_id' });

  // 2. Contacts from relationship engine
  const contacts = await getContactsWithRelationshipStats(userId);

  const contactNodes = contacts.map((c: any) => ({
    user_id: dbUserId,
    node_type: 'contact',
    node_id: c.id,
    label: c.name,
    roles: c.roles || [],
    importance_score: c.importance_score ?? 0.5,
    last_interaction_at: c.last_interaction_at ?? null,
    updated_at: new Date().toISOString(),
  }));

  if (contactNodes.length) {
    const { error } = await supabaseAdmin
      .from('social_nodes')
      .upsert(contactNodes, { onConflict: 'user_id,node_type,node_id' });

    if (error) {
      console.error('[Social] Failed to upsert contact nodes', error);
      throw error;
    }
  }
}


