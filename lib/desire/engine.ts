// Desire Profile Engine
// lib/desire/engine.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { DesireProfile, DesireEntityType } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const DESIRE_PROFILE_SYSTEM_PROMPT = `
You are the Desire Modeling Engine for a life OS.

You see a sequence of "desire signals" for one entity (either the user themselves, or someone in their contacts).

Each signal indicates choices, preferences, avoided situations, positive or negative reactions, etc.

Your job:
1. Infer what this entity generally WANTS and DOESN'T WANT across relevant domains:
   - work, relationships, money, health, self, etc.
2. Identify key priorities with weights (0–1).
3. Identify avoidance triggers (what they strongly dislike or avoid).
4. Summarize preferred interaction styles (e.g., direct vs indirect, structured vs spontaneous).
5. Identify:
   - long-term desires (big-picture wants),
   - short-term preferences (situational).

Return JSON:
{
  "profile": {
    "summary": "...",
    "priorities": { "work_success": 0.9, "family_warmth": 0.95, ... },
    "avoidanceTriggers": [
      { "label": "being micromanaged", "contexts": ["work"], "severity": 0.8 },
      ...
    ],
    "preferredStyles": { ... },
    "rewardSignals": { ... },
    "longTermDesires": [
      { "label": "be a present father", "strength": 0.95 },
      ...
    ],
    "shortTermPreferences": { ... }
  }
}

Only return valid JSON.`;

async function buildDesireProfileForEntity(params: {
  userId: string;
  entityType: DesireEntityType;
  entityId: string;
}) {
  const dbUserId = await resolveUserId(params.userId);
  const { entityType, entityId } = params;

  const { data: signals, error } = await supabaseAdmin
    .from('desire_signals')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('signal_time', { ascending: true })
    .limit(200); // Limit for context

  if (error) throw error;

  if (!signals || signals.length === 0) {
    // No signals yet, skip profile building
    return;
  }

  // For self, optionally include narrative context
  let narrativeContext = null;
  if (entityType === 'self') {
    try {
      const { getCurrentNarrativeContextForUser } = await import('@/lib/narrative/context');
      narrativeContext = await getCurrentNarrativeContextForUser(params.userId);
    } catch (err) {
      // Narrative might not be available, that's okay
    }
  }

  const result = await callAIJson<{
    profile: {
      summary?: string;
      priorities?: Record<string, number>;
      avoidanceTriggers?: Array<{
        label: string;
        contexts?: string[];
        severity: number;
      }>;
      preferredStyles?: any;
      rewardSignals?: any;
      longTermDesires?: Array<{ label: string; strength: number }>;
      shortTermPreferences?: any;
    };
  }>({
    userId: params.userId,
    feature: 'desire_profile',
    systemPrompt: DESIRE_PROFILE_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      entityType,
      signals: signals.slice(0, 100), // Limit for LLM context
      narrativeContext: entityType === 'self' ? narrativeContext : null,
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Desire] Failed to build profile', result.error);
    return;
  }

  const { profile } = result.data;

  const { error: upsertError } = await supabaseAdmin
    .from('desire_profiles')
    .upsert(
      {
        user_id: dbUserId,
        entity_type: entityType,
        entity_id: entityId,
        summary: profile.summary ?? null,
        priorities: profile.priorities ?? {},
        avoidance_triggers: profile.avoidanceTriggers ?? [],
        preferred_styles: profile.preferredStyles ?? {},
        reward_signals: profile.rewardSignals ?? {},
        long_term_desires: profile.longTermDesires ?? [],
        short_term_preferences: profile.shortTermPreferences ?? {},
        last_refreshed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,entity_type,entity_id' }
    );

  if (upsertError) {
    console.error('[Desire] Failed to upsert profile', upsertError);
    throw upsertError;
  }
}

export async function getImportantContactIdsForUser(userId: string): Promise<string[]> {
  const dbUserId = await resolveUserId(userId);

  // Get important contacts from contacts table (top by interaction or flagged as important)
  const { data: contacts } = await supabaseAdmin
    .from('contacts')
    .select('id')
    .eq('user_id', dbUserId)
    .or('is_important.eq.true,interaction_count.gt.5')
    .order('interaction_count', { ascending: false })
    .limit(20);

  return (contacts || []).map((c: any) => c.id);
}

export async function refreshDesireProfilesForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  // 1. Self
  await buildDesireProfileForEntity({ userId, entityType: 'self', entityId: dbUserId });

  // 2. Important contacts
  const contactIds = await getImportantContactIdsForUser(userId);

  for (const contactId of contactIds) {
    try {
      await buildDesireProfileForEntity({ userId, entityType: 'contact', entityId: contactId });
    } catch (err) {
      console.error(`[Desire] Failed to build profile for contact ${contactId}`, err);
      // Continue with other contacts
    }
  }
}


