// Value Profile Builder
// lib/ethics/value_profile.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { ValueProfile } from './types';
import { getCurrentNarrativeContextForUser } from '@/lib/narrative/context';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const VALUE_PROFILE_SYSTEM_PROMPT = `
You are the Value Alignment Engine.

You see:
- Identity Engine data: roles, strengths, explicit values if known.
- Narrative Engine context: life themes, identity arcs, chapter summaries.

Your job:
1. Infer the user's core values (3-10), each with a strength 0-1.
2. Infer rolePriorities (how important roles like father, partner, builder, banker, etc. are).
3. Identify red_lines:
   - things the user clearly does NOT want to do (e.g., betray trust, hurt family, act dishonestly).
4. Write a short, human-friendly summary of "what this person stands for."
5. Write a 1–2 line aspirationStatement: who they are trying to become.

Return JSON: { "valueProfile": { ... } }.

Only return valid JSON.`;

async function getIdentityProfileForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  // Try to get from identity engine
  try {
    const { getIdentityProfile } = await import('@/lib/identity-engine');
    const profile = await getIdentityProfile(userId);
    if (profile) {
      return {
        values: profile.values || [],
        roles: profile.roles || [],
        strengths: profile.strengths || [],
        aspirations: profile.aspirations || [],
      };
    }
  } catch (err) {
    // Identity engine might not be available
  }

  // Fallback: get from agi_user_profile
  const { data: agiProfile } = await supabaseAdmin
    .from('agi_user_profile')
    .select('*')
    .eq('user_id', dbUserId)
    .maybeSingle();

  return {
    values: agiProfile?.values || [],
    roles: agiProfile?.roles || [],
    strengths: [],
    aspirations: [],
  };
}

export async function refreshValueProfileForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  // 1. Load identity engine data
  const identity = await getIdentityProfileForUser(userId);

  // 2. Load narrative context
  const narrative = await getCurrentNarrativeContextForUser(userId).catch(() => null);

  const result = await callAIJson<{ valueProfile: ValueProfile }>({
    userId,
    feature: 'value_profile',
    systemPrompt: VALUE_PROFILE_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      identity: {
        values: identity.values || [],
        roles: identity.roles || [],
        strengths: identity.strengths || [],
        aspirations: identity.aspirations || [],
      },
      narrative: narrative ? {
        chapter: narrative.chapter?.title,
        themes: narrative.themes.map((t: any) => ({ key: t.key, name: t.name, strength: t.strength })),
        arcs: narrative.arcs.map((a: any) => ({ key: a.key, name: a.name, progress: a.progress })),
      } : null,
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Ethics] Failed to build value profile', result.error);
    return;
  }

  const { valueProfile } = result.data;

  const { error } = await supabaseAdmin
    .from('value_profile')
    .upsert(
      {
        user_id: dbUserId,
        summary: valueProfile.summary ?? null,
        core_values: valueProfile.coreValues ?? [],
        role_priorities: valueProfile.rolePriorities ?? {},
        red_lines: valueProfile.redLines ?? [],
        aspiration_statement: valueProfile.aspirationStatement ?? null,
        last_refreshed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[Ethics] Failed to upsert value profile', error);
    throw error;
  }
}


