// Theory of Mind Engine
// lib/mind/engine.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { MindModel, MindEntityType } from './types';
import { getImportantContactIdsForUser } from '@/lib/desire/engine';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const MIND_MODEL_SYSTEM_PROMPT = `
You are the Theory of Mind Engine for a life OS.

You are given data about one entity (either the user or a specific contact):

- Desire profile: what they want, avoid, value.
- Recent behavioral predictions and outcomes.
- Relationship context (if contact): history, tone, health, tensions.
- Communication samples (emails/messages).

Your job:
1. Infer how this person generally thinks and feels:
   - cognitive_style: direct vs indirect, detail vs big-picture, structure vs spontaneity.
   - emotional_pattern: stress reactivity, baseline mood, volatility.
   - conflict_pattern: how they handle disagreement (avoidant, combative, collaborative, etc.).
   - trust_model: how and when they tend to trust/doubt others.

2. For contacts, infer perception_of_user:
   - how they likely see the user (respect, skepticism, warmth, distance, etc.).

3. Identify typical_reactions:
   - "When the user pushes for decisions quickly, they tend to..."
   - "When they feel overwhelmed, they usually..."

4. Identify constraints:
   - time constraints, bandwidth, family obligations, recurring stressors.

This model must be used for empathy, timing, and better communication, NOT manipulation.

Return JSON: { "mindModel": { ... } }.

Only return valid JSON.`;

async function getRelationshipContextForContact(userId: string, contactId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  // Get contact info
  const { data: contact } = await supabaseAdmin
    .from('contacts')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('id', contactId)
    .maybeSingle();

  // Get recent interactions
  const { data: recentCalls } = await supabaseAdmin
    .from('call_sessions')
    .select('*')
    .eq('user_id', dbUserId)
    .order('started_at', { ascending: false })
    .limit(10);

  return {
    contact: contact ? {
      name: contact.name,
      relationshipType: contact.relationship_type,
      isImportant: contact.is_important,
    } : null,
    recentInteractions: (recentCalls || []).length,
  };
}

async function getCommunicationSamplesForEntity(userId: string, entityType: MindEntityType, entityId: string): Promise<any[]> {
  // For v1, we'll return empty array
  // In a full implementation, this would fetch emails, messages, notes involving this entity
  return [];
}

async function buildMindModelForEntity(params: {
  userId: string;
  entityType: MindEntityType;
  entityId: string;
}) {
  const dbUserId = await resolveUserId(params.userId);
  const { entityType, entityId } = params;

  // 1. Load desire profile
  const { data: desireRows } = await supabaseAdmin
    .from('desire_profiles')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .limit(1);

  const desireProfile = desireRows?.[0] ?? null;

  // 2. Load behavior predictions (recent)
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: behaviorRows } = await supabaseAdmin
    .from('behavior_predictions')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .gte('prediction_time', since.toISOString())
    .limit(50);

  // 3. Load relationship context if contact
  let relationshipContext = null;
  if (entityType === 'contact') {
    relationshipContext = await getRelationshipContextForContact(params.userId, entityId);
  }

  // 4. Load communication samples
  const communicationSamples = await getCommunicationSamplesForEntity(params.userId, entityType, entityId);

  // If no data available, skip model building
  if (!desireProfile && (!behaviorRows || behaviorRows.length === 0) && !relationshipContext) {
    console.warn(`[Mind] Insufficient data to build model for ${entityType}:${entityId}`);
    return;
  }

  const result = await callAIJson<{
    mindModel: {
      summary?: string;
      cognitiveStyle?: any;
      emotionalPattern?: any;
      conflictPattern?: any;
      trustModel?: any;
      perceptionOfUser?: any;
      typicalReactions?: any;
      constraints?: any;
    };
  }>({
    userId: params.userId,
    feature: 'mind_model',
    systemPrompt: MIND_MODEL_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      entityType,
      desireProfile: desireProfile ? {
        summary: desireProfile.summary,
        priorities: desireProfile.priorities,
        avoidanceTriggers: desireProfile.avoidance_triggers,
        preferredStyles: desireProfile.preferred_styles,
      } : null,
      behaviorPredictions: (behaviorRows || []).slice(0, 20),
      relationshipContext,
      communicationSamples,
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Mind] Failed to build model', result.error);
    return;
  }

  const { mindModel } = result.data;

  const { error } = await supabaseAdmin
    .from('mind_models')
    .upsert(
      {
        user_id: dbUserId,
        entity_type: entityType,
        entity_id: entityId,
        summary: mindModel.summary ?? null,
        cognitive_style: mindModel.cognitiveStyle ?? {},
        emotional_pattern: mindModel.emotionalPattern ?? {},
        conflict_pattern: mindModel.conflictPattern ?? {},
        trust_model: mindModel.trustModel ?? {},
        perception_of_user: mindModel.perceptionOfUser ?? null,
        typical_reactions: mindModel.typicalReactions ?? {},
        constraints: mindModel.constraints ?? {},
        last_refreshed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,entity_type,entity_id' }
    );

  if (error) {
    console.error('[Mind] Failed to upsert model', error);
    throw error;
  }
}

export async function refreshMindModelsForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  // 1. Self
  await buildMindModelForEntity({ userId, entityType: 'self', entityId: dbUserId });

  // 2. Important contacts
  const contactIds = await getImportantContactIdsForUser(userId);

  for (const contactId of contactIds) {
    try {
      await buildMindModelForEntity({ userId, entityType: 'contact', entityId: contactId });
    } catch (err) {
      console.error(`[Mind] Failed to build model for contact ${contactId}`, err);
      // Continue with other contacts
    }
  }
}


