// Destiny Blueprint Builder
// lib/destiny/blueprints.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { DestinyBlueprint } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const DESTINY_BLUEPRINTS_PROMPT = `
You are the Destiny Engine for a life OS.

You see:
- Identity Engine profile (key roles, strengths, drives).
- Narrative context (chapters, recurring themes).
- Value profile (what matters most to the user).
- Wisdom summary (what actually works for them).

Your job:
1. Propose 2–5 Destiny Blueprints for the next 3–10 years.
2. Each blueprint is a coherent "life direction" this person could realistically grow into at their best.
3. For each:
   - key: machine-readable id.
   - name and tagline.
   - horizonYears (3–10).
   - description (short).
   - identityThemes: roles/virtues/motifs central to this destiny.
   - domainTargets: qualitative targets for work, relationships, health, finance, self.
   - nonNegotiables: boundaries they should not cross even in pursuit of this destiny.
   - tradeoffPhilosophy: what they are willing to sacrifice, and what they are not.
   - isPrimary: mark the ONE you believe is most aligned with their deepest story.

Return JSON: { "blueprints": [ ... ] }.

Only return valid JSON.`;

async function getIdentityProfileForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

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

  // Fallback
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

async function getCurrentNarrativeContextForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data: chapters } = await supabaseAdmin
    .from('life_chapters')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('status', 'active')
    .order('chapter_index', { ascending: false })
    .limit(1);

  const { data: snapshots } = await supabaseAdmin
    .from('narrative_snapshots')
    .select('*')
    .eq('user_id', dbUserId)
    .order('snapshot_at', { ascending: false })
    .limit(1);

  const { data: themes } = await supabaseAdmin
    .from('life_themes')
    .select('*')
    .eq('user_id', dbUserId)
    .not('strength', 'is', null)
    .order('strength', { ascending: false })
    .limit(5);

  return {
    chapter: chapters?.[0] ?? null,
    snapshot: snapshots?.[0] ?? null,
    themes: themes || [],
  };
}

async function getValueProfileForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data } = await supabaseAdmin
    .from('value_profile')
    .select('*')
    .eq('user_id', dbUserId)
    .limit(1);

  return data?.[0] ?? null;
}

async function getWisdomMetaSummaryForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data: lessons } = await supabaseAdmin
    .from('wisdom_lessons')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('status', 'active')
    .order('strength', { ascending: false })
    .limit(10);

  const { data: playbooks } = await supabaseAdmin
    .from('wisdom_playbooks')
    .select('*')
    .eq('user_id', dbUserId)
    .order('usage_count', { ascending: false })
    .limit(5);

  return {
    topLessons: (lessons || []).slice(0, 5).map((l: any) => ({
      title: l.title,
      summary: l.summary,
      strength: l.strength,
    })),
    topPlaybooks: (playbooks || []).slice(0, 3).map((p: any) => ({
      key: p.key,
      name: p.name,
      description: p.description,
    })),
  };
}

export async function refreshDestinyBlueprintsForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const [identity, narrative, valueProfile, wisdomSummary] = await Promise.all([
    getIdentityProfileForUser(userId).catch(() => null),
    getCurrentNarrativeContextForUser(userId).catch(() => null),
    getValueProfileForUser(userId).catch(() => null),
    getWisdomMetaSummaryForUser(userId).catch(() => null),
  ]);

  const result = await callAIJson<{ blueprints: DestinyBlueprint[] }>({
    userId,
    feature: 'destiny_blueprints',
    systemPrompt: DESTINY_BLUEPRINTS_PROMPT,
    userPrompt: JSON.stringify({
      identity,
      narrative: narrative ? {
        chapter: narrative.chapter?.title,
        themes: narrative.themes.map((t: any) => ({ key: t.key, name: t.name, strength: t.strength })),
        snapshot: narrative.snapshot ? {
          shortLogline: narrative.snapshot.short_logline,
          tensions: narrative.snapshot.tensions || [],
        } : null,
      } : null,
      valueProfile: valueProfile ? {
        summary: valueProfile.summary,
        coreValues: valueProfile.core_values || [],
        rolePriorities: valueProfile.role_priorities || {},
        redLines: valueProfile.red_lines || [],
      } : null,
      wisdomSummary,
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.8, // Higher for more creative/aspirational blueprints
  });

  if (!result.success || !result.data || !result.data.blueprints?.length) {
    console.error('[Destiny] Failed to generate blueprints', result.error);
    return;
  }

  const { blueprints } = result.data;

  // Clear previous primary flag
  await supabaseAdmin
    .from('destiny_blueprints')
    .update({ is_primary: false })
    .eq('user_id', dbUserId);

  const rows = blueprints.map((b) => ({
    user_id: dbUserId,
    key: b.key,
    name: b.name,
    tagline: b.tagline ?? null,
    horizon_years: b.horizonYears,
    description: b.description ?? null,
    identity_themes: b.identityThemes ?? {},
    domain_targets: b.domainTargets ?? {},
    non_negotiables: b.nonNegotiables ?? {},
    tradeoff_philosophy: b.tradeoffPhilosophy ?? {},
    is_primary: b.isPrimary ?? false,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin
    .from('destiny_blueprints')
    .upsert(rows, { onConflict: 'user_id,key' });

  if (error) {
    console.error('[Destiny] Failed to upsert blueprints', error);
    throw error;
  }
}


