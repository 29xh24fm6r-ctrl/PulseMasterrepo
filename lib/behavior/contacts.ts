// Contact Behavior Prediction
// lib/behavior/contacts.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { BehaviorPrediction } from './types';
import { getImportantContactIdsForUser } from '@/lib/desire/engine';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const CONTACT_BEHAVIOR_PREDICTION_SYSTEM_PROMPT = `
You are the Behavioral Prediction Engine focused on one contact in the user's life.

You see:
- The contact's inferred desire profile (what they value, avoid, and prefer in interactions).
- Relationship context (history, health, frequency, recent tensions or positive streaks).
- A list of upcoming or pending interactions between the user and this contact:
  - emails awaiting reply,
  - requests,
  - invitations,
  - scheduled meetings.

Your job:
1. For each target interaction, predict concrete outcomes, such as:
   - 'will_reply_within_24h'
   - 'will_likely_ignore'
   - 'will_accept_meeting'
   - 'will_decline'
   - 'risk_of_tension'
2. Assign probabilities (0–1) and a short reasoning_summary.
3. Suggest non-manipulative, empathic interventions:
   - adjust timing,
   - soften language,
   - clarify expectations,
   - reduce ask size,
   - offer something they value.

Do NOT generate manipulative strategies or psychological exploitation. Focus on empathy, clarity, and mutual benefit.

Return JSON:
{ "predictions": [ ... ] }.

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

  // Get recent interactions (calls, emails, meetings)
  const { data: recentCalls } = await supabaseAdmin
    .from('call_sessions')
    .select('*')
    .eq('user_id', dbUserId)
    .contains('participants', [{ contact_id: contactId }])
    .order('started_at', { ascending: false })
    .limit(5);

  return {
    contact: contact ? {
      name: contact.name,
      relationshipType: contact.relationship_type,
      isImportant: contact.is_important,
    } : null,
    recentInteractions: (recentCalls || []).length,
  };
}

async function getContactPredictionTargets(userId: string, contactId: string, date: Date): Promise<any[]> {
  const dbUserId = await resolveUserId(userId);
  const targets: any[] = [];

  // Get pending emails/threads involving this contact
  // For v1, we'll use a simple approach - check for any pending interactions
  // In a full implementation, this would query email threads, meeting invites, etc.

  // Placeholder: return empty for now, can be expanded
  return targets;
}

async function refreshContactBehaviorPredictionsForEntity(userId: string, contactId: string, date: Date) {
  const dbUserId = await resolveUserId(userId);

  // 1. Load desire profile for this contact
  const { data: desireRows } = await supabaseAdmin
    .from('desire_profiles')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('entity_type', 'contact')
    .eq('entity_id', contactId)
    .limit(1);

  const desireProfile = desireRows?.[0] ?? null;

  // 2. Load relationship context
  const relationshipContext = await getRelationshipContextForContact(userId, contactId);

  // 3. Load pending/ongoing interactions as prediction targets
  const targets = await getContactPredictionTargets(userId, contactId, date);

  if (!targets.length) {
    // No pending interactions to predict, skip
    return;
  }

  const result = await callAIJson<{
    predictions: Array<{
      targetType: string;
      targetId?: string;
      horizon: string;
      outcomeLabel: string;
      probability: number;
      reasoningSummary?: string;
      recommendedIntervention?: any;
    }>;
  }>({
    userId,
    feature: 'behavior_prediction_contact',
    systemPrompt: CONTACT_BEHAVIOR_PREDICTION_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      date: date.toISOString().slice(0, 10),
      contactId,
      desireProfile: desireProfile ? {
        summary: desireProfile.summary,
        priorities: desireProfile.priorities,
        preferredStyles: desireProfile.preferred_styles,
        avoidanceTriggers: desireProfile.avoidance_triggers,
      } : null,
      relationshipContext,
      targets,
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data || !result.data.predictions?.length) {
    return;
  }

  const { predictions } = result.data;

  const rows = predictions.map((p) => ({
    user_id: dbUserId,
    entity_type: 'contact',
    entity_id: contactId,
    target_type: p.targetType,
    target_id: p.targetId ?? null,
    horizon: p.horizon || '24h',
    outcome_label: p.outcomeLabel,
    probability: p.probability,
    reasoning_summary: p.reasoningSummary ?? null,
    features_used: {},
    recommended_intervention: p.recommendedIntervention ?? {},
  }));

  const { error } = await supabaseAdmin
    .from('behavior_predictions')
    .insert(rows);

  if (error) {
    console.error(`[Behavior] Failed to insert predictions for contact ${contactId}`, error);
    // Don't throw, continue with other contacts
  }
}

export async function refreshContactBehaviorPredictionsForUser(userId: string, date: Date) {
  const contactIds = await getImportantContactIdsForUser(userId);

  for (const contactId of contactIds) {
    try {
      await refreshContactBehaviorPredictionsForEntity(userId, contactId, date);
    } catch (err) {
      console.error(`[Behavior] Failed to predict for contact ${contactId}`, err);
      // Continue with other contacts
    }
  }
}


