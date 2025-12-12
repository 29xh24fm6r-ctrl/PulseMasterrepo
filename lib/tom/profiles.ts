// Theory of Mind Profile Inference
// lib/tom/profiles.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { TheoryOfMindProfile } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const TOM_PROFILE_PROMPT = `
You are the Theory of Mind Engine.

You see:
- A person (social_entity) in the user's life.
- The relationship edges involving them.
- Interaction events (emails, calls, conflicts, celebrations, etc.) with summaries and evaluations.

Your job:
Infer a compassionate, non-judgmental model of how this person works:

- coreTraits: stable tendencies (e.g. sensitive, meticulous, reactive under stress).
- motivationalDrivers: what they most care about (security, love, respect, autonomy, achievement).
- stressTriggers: patterns that reliably upset them.
- soothingPatterns: what helps them feel safe and seen.
- conflictPatterns: how conflicts tend to unfold with them.
- communicationStyle: channel/time preferences, directness, pacing.
- currentStateHypothesis: your best guess at their present emotional + stress state, given recent events.
- summary: 2–4 sentence overview of how to be a good partner to this person.

Return JSON: { "profile": { ... } }.

Only return valid JSON.`;

export async function refreshTheoryOfMindProfileForEntity(userId: string, entityId: string) {
  const dbUserId = await resolveUserId(userId);

  // Gather interaction/context data for this entity
  const [{ data: entityRows }, { data: edgeRows }, interactionsRes] = await Promise.all([
    supabaseAdmin
      .from('social_entities')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('id', entityId)
      .limit(1),
    supabaseAdmin
      .from('social_edges')
      .select('*')
      .eq('user_id', dbUserId)
      .or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`),
    supabaseAdmin
      .from('experience_events')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('ref_type', 'relationship')
      .eq('ref_id', entityId)
      .order('occurred_at', { ascending: false })
      .limit(20),
  ]);

  const entity = entityRows?.[0];
  if (!entity) {
    console.warn('[ToM] Entity not found', entityId);
    return;
  }

  // Also try to get desire profile and behavior predictions if they exist
  const [{ data: desireProfile }, { data: behaviorPreds }] = await Promise.all([
    supabaseAdmin
      .from('desire_profiles')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('entity_type', 'contact')
      .eq('entity_id', entityId)
      .limit(1),
    supabaseAdmin
      .from('behavior_predictions')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('entity_type', 'contact')
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const result = await callAIJson<{ profile: TheoryOfMindProfile }>({
    userId,
    feature: 'theory_of_mind',
    systemPrompt: TOM_PROFILE_PROMPT,
    userPrompt: JSON.stringify({
      entity: {
        displayName: entity.display_name,
        roleLabel: entity.role_label,
        importance: entity.importance,
        tags: entity.tags || [],
        lastInteractionAt: entity.last_interaction_at,
      },
      edges: (edgeRows || []).map((e: any) => ({
        relationshipType: e.relationship_type,
        direction: e.direction,
        closeness: e.closeness,
        trust: e.trust,
        tension: e.tension,
        drift: e.drift,
        supportiveness: e.supportiveness,
        metrics: e.metrics || {},
      })),
      interactions: (interactionsRes.data || []).slice(0, 15).map((e: any) => ({
        source: e.source,
        kind: e.kind,
        description: e.description,
        evaluation: e.evaluation || {},
        occurredAt: e.occurred_at,
      })),
      desireProfile: desireProfile?.[0] ? {
        summary: desireProfile[0].summary,
        coreDesires: desireProfile[0].core_desires || {},
        aversions: desireProfile[0].aversions || {},
      } : null,
      behaviorPredictions: (behaviorPreds || []).slice(0, 3).map((b: any) => ({
        target: b.target,
        prediction: b.prediction,
        confidence: b.confidence,
      })),
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[ToM] Failed to generate profile', result.error);
    return;
  }

  const { profile } = result.data;

  const { error } = await supabaseAdmin
    .from('theory_of_mind_profiles')
    .upsert(
      {
        user_id: dbUserId,
        entity_id: entityId,
        core_traits: profile.coreTraits ?? {},
        motivational_drivers: profile.motivationalDrivers ?? {},
        stress_triggers: profile.stressTriggers ?? {},
        soothing_patterns: profile.soothingPatterns ?? {},
        conflict_patterns: profile.conflictPatterns ?? {},
        communication_style: profile.communicationStyle ?? {},
        current_state_hypothesis: profile.currentStateHypothesis ?? {},
        summary: profile.summary ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,entity_id' }
    );

  if (error) {
    console.error('[ToM] Failed to upsert profile', error);
    throw error;
  }
}


