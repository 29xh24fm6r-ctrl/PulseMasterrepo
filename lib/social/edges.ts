// Social Edges Builder
// lib/social/edges.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { getRelationshipContextForContact } from '@/lib/mind/engine';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const SOCIAL_EDGE_SYSTEM_PROMPT = `
You are the Social Graph Engine for a life OS.

You see:
- Relationship context: history, interaction frequency, last contact, sentiment.
- Mind model of the user.
- Mind model of the contact.
- Desire profiles for both.

Your job:
Estimate these metrics for the relationship from the user's perspective (0..1):

- strength: closeness and mutual importance.
- trust: how much the user can rely on them (and vice versa).
- tension: current friction / unresolved conflict.
- drift: risk that this relationship is fading or disconnecting.
- influence: how much this person shapes the user's decisions and path.
- positivity: average emotional positivity in interactions.

Also, specify relationshipType if obvious (spouse, boss, client, friend, etc.).

Return JSON: { "edge": { ... } }.

Only return valid JSON.`;

async function getMindModel(userId: string, entityType: string, entityId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);
  const dbEntityId = entityType === 'self' ? dbUserId : entityId;

  const { data } = await supabaseAdmin
    .from('mind_models')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('entity_type', entityType)
    .eq('entity_id', dbEntityId)
    .limit(1);

  return data?.[0] ?? null;
}

async function getDesireProfile(userId: string, entityType: string, entityId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);
  const dbEntityId = entityType === 'self' ? dbUserId : entityId;

  const { data } = await supabaseAdmin
    .from('desire_profiles')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('entity_type', entityType)
    .eq('entity_id', dbEntityId)
    .limit(1);

  return data?.[0] ?? null;
}

async function refreshSocialEdgeForContact(userId: string, contactId: string) {
  const dbUserId = await resolveUserId(userId);

  // 1. Relationship stats from relationship engine
  const relationshipContext = await getRelationshipContextForContact(userId, contactId);

  // 2. Mind models for self and contact
  const selfMind = await getMindModel(userId, 'self', dbUserId);
  const contactMind = await getMindModel(userId, 'contact', contactId);

  // 3. Desire profiles
  const selfDesire = await getDesireProfile(userId, 'self', dbUserId);
  const contactDesire = await getDesireProfile(userId, 'contact', contactId);

  const result = await callAIJson<{
    edge: {
      relationshipType?: string;
      strength: number;
      trust: number;
      tension: number;
      drift: number;
      influence: number;
      positivity: number;
    };
  }>({
    userId,
    feature: 'social_edge',
    systemPrompt: SOCIAL_EDGE_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      relationshipContext,
      selfMind: selfMind ? {
        summary: selfMind.summary,
        cognitiveStyle: selfMind.cognitive_style,
        emotionalPattern: selfMind.emotional_pattern,
      } : null,
      contactMind: contactMind ? {
        summary: contactMind.summary,
        cognitiveStyle: contactMind.cognitive_style,
        emotionalPattern: contactMind.emotional_pattern,
        perceptionOfUser: contactMind.perception_of_user,
      } : null,
      selfDesire: selfDesire ? {
        priorities: selfDesire.priorities,
      } : null,
      contactDesire: contactDesire ? {
        priorities: contactDesire.priorities,
        avoidanceTriggers: contactDesire.avoidance_triggers,
      } : null,
    }, null, 2),
    maxTokens: 1500,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error(`[Social] Failed to generate edge for contact ${contactId}`, result.error);
    return;
  }

  const { edge } = result.data;

  const { error } = await supabaseAdmin
    .from('social_edges')
    .upsert(
      {
        user_id: dbUserId,
        from_node_type: 'self',
        from_node_id: dbUserId,
        to_node_type: 'contact',
        to_node_id: contactId,
        relationship_type: edge.relationshipType ?? relationshipContext?.contact?.relationshipType ?? null,
        strength: edge.strength,
        trust: edge.trust,
        tension: edge.tension,
        drift: edge.drift,
        influence: edge.influence,
        positivity: edge.positivity,
        last_updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,from_node_type,from_node_id,to_node_type,to_node_id' }
    );

  if (error) {
    console.error(`[Social] Failed to upsert edge for contact ${contactId}`, error);
    throw error;
  }
}

export async function refreshSocialEdgesForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  // Get all contact nodes
  const { data: nodes } = await supabaseAdmin
    .from('social_nodes')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('node_type', 'contact');

  if (!nodes || nodes.length === 0) return;

  for (const node of nodes) {
    try {
      await refreshSocialEdgeForContact(userId, node.node_id);
    } catch (err) {
      console.error(`[Social] Failed to refresh edge for contact ${node.node_id}`, err);
      // Continue with other contacts
    }
  }
}


