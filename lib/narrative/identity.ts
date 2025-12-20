// Identity Arcs
// lib/narrative/identity.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const IDENTITY_ARCS_SYSTEM_PROMPT = `
You are the Narrative Intelligence Engine analyzing identity arcs.

You receive:
- Identity profile (values, roles, archetype)
- Life themes
- Active goals

Your job:
Identify 2–6 long-term identity arcs - stories about who this person is becoming.

Examples:
- "From overwhelmed executor to strategic architect"
- "From debt-stressed to financially autonomous"
- "From reactive husband to intentional partner"
- "From solo hustler to system builder"

For each arc, provide:
- key (machine-friendly, snake_case),
- name (user-friendly),
- description (overall story of the arc),
- status ('active', 'completed', 'abandoned'),
- progress (0–1 estimated completion),
- associatedRoles (e.g., ['father', 'founder']),
- drivingValues (from identity engine),
- relatedThemeKeys (theme keys that relate),
- startDate and projectedEndDate (if obvious).

Return JSON: { "arcs": [ ... ] }.

Only return valid JSON.`;

async function getIdentityProfileForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  // Try to get identity profile from identity engine
  try {
    // Try identity_profiles table first
    const { data: profile } = await supabaseAdmin
      .from('identity_profiles')
      .select('*')
      .eq('user_id', dbUserId)
      .maybeSingle();

    if (profile) return profile;
  } catch (err) {
    // Table might not exist, that's okay
  }

  // Try identity engine v3
  try {
    const { getIdentityProfile } = await import('@/lib/identity-engine');
    const profile = await getIdentityProfile(userId);
    if (profile) {
      return {
        roles: profile.roles || [],
        values: profile.values || [],
        strengths: profile.strengths || [],
        aspirations: profile.aspirations || [],
      };
    }
  } catch (err) {
    // Identity engine might not be available
  }

  // Fallback: get from agi_user_profile or create minimal
  const { data: agiProfile } = await supabaseAdmin
    .from('agi_user_profile')
    .select('*')
    .eq('user_id', dbUserId)
    .maybeSingle();

  return {
    roles: agiProfile?.roles || [],
    values: agiProfile?.values || [],
    archetype: agiProfile?.archetype || 'unknown',
  };
}

export async function refreshIdentityArcsForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  // 1. Load identity profile
  const identity = await getIdentityProfileForUser(userId);

  const { data: themes } = await supabaseAdmin
    .from('life_themes')
    .select('*')
    .eq('user_id', dbUserId);

  const { data: goals } = await supabaseAdmin
    .from('goals')
    .select('*')
    .eq('user_id', dbUserId)
    .in('status', ['active', 'in_progress'])
    .limit(20);

  const result = await callAIJson<{
    arcs: Array<{
      key: string;
      name: string;
      description?: string;
      status: 'active' | 'completed' | 'abandoned';
      progress: number;
      associatedRoles?: string[];
      drivingValues?: string[];
      relatedThemeKeys?: string[];
      startDate?: string;
      projectedEndDate?: string;
    }>;
  }>({
    userId,
    feature: 'narrative_identity_arcs',
    systemPrompt: IDENTITY_ARCS_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      identity,
      themes: themes || [],
      goals: (goals || []).map((g: any) => ({
        id: g.id,
        title: g.title,
        status: g.status,
      })),
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data || !result.data.arcs?.length) {
    console.warn('[Narrative] No identity arcs generated');
    return;
  }

  const { arcs } = result.data;

  const rows = arcs.map((a) => ({
    user_id: dbUserId,
    key: a.key,
    name: a.name,
    description: a.description ?? null,
    status: a.status,
    progress: a.progress,
    associated_roles: a.associatedRoles ?? [],
    driving_values: a.drivingValues ?? [],
    related_theme_keys: a.relatedThemeKeys ?? [],
    start_date: a.startDate ?? null,
    projected_end_date: a.projectedEndDate ?? null,
    evidence: {}, // v1: can be filled later
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin
    .from('identity_arcs')
    .upsert(rows, { onConflict: 'user_id,key' });

  if (error) {
    console.error('[Narrative] Failed to upsert identity arcs', error);
    throw error;
  }
}

