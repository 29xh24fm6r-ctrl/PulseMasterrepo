// Timeline Preference Profile Builder
// lib/timeline_coach/preferences.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { TimelinePreferenceProfile } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const TIMELINE_PREFERENCES_PROMPT = `
You are the Timeline Preference Engine.

You see:
- The user's valueProfile (core values, roles, red lines).
- Wisdom meta summary (what tends to work for them).
- Past timeline_decisions and timeline_reflections.

Your job:
1. Infer domainWeights: how much they prioritize various life domains (work, relationships, health, finance, self-respect).
2. Infer riskTolerance across domains.
3. Infer timePreferences (short-term wins vs long-term build).
4. Describe comfortZones and sacrificePreferences.
5. Write a short summary of "What this person truly prefers in their futures."

Return JSON: { "profile": { ... } }.

Only return valid JSON.`;

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

export async function refreshTimelinePreferenceProfileForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const [valueProfile, wisdomSummary, decisionsRes, reflectionsRes] = await Promise.all([
    getValueProfileForUser(userId).catch(() => null),
    getWisdomMetaSummaryForUser(userId).catch(() => null),
    supabaseAdmin
      .from('timeline_decisions')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('timeline_reflections')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: true }),
  ]);

  const result = await callAIJson<{ profile: TimelinePreferenceProfile }>({
    userId,
    feature: 'timeline_preferences',
    systemPrompt: TIMELINE_PREFERENCES_PROMPT,
    userPrompt: JSON.stringify({
      valueProfile: valueProfile ? {
        summary: valueProfile.summary,
        coreValues: valueProfile.core_values || [],
        rolePriorities: valueProfile.role_priorities || {},
        redLines: valueProfile.red_lines || [],
      } : null,
      wisdomSummary,
      decisions: (decisionsRes.data || []).slice(0, 10).map((d: any) => ({
        label: d.label,
        rationale: d.rationale,
        perceivedBenefits: d.perceived_benefits,
        perceivedCosts: d.perceived_costs,
      })),
      reflections: (reflectionsRes.data || []).slice(0, 5).map((r: any) => ({
        feltOutcomeSummary: r.felt_outcome_summary,
        satisfactionScore: r.satisfaction_score,
        lessons: r.lessons,
      })),
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Timeline Coach] Failed to generate preference profile', result.error);
    return;
  }

  const { profile } = result.data;

  const { error } = await supabaseAdmin
    .from('timeline_preference_profile')
    .upsert(
      {
        user_id: dbUserId,
        domain_weights: profile.domainWeights ?? {},
        risk_tolerance: profile.riskTolerance ?? {},
        time_preferences: profile.timePreferences ?? {},
        comfort_zones: profile.comfortZones ?? {},
        sacrifice_preferences: profile.sacrificePreferences ?? {},
        summary: profile.summary ?? null,
        last_refreshed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[Timeline Coach] Failed to upsert preference profile', error);
    throw error;
  }
}

export async function getTimelinePreferenceProfileForUser(userId: string): Promise<TimelinePreferenceProfile | null> {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('timeline_preference_profile')
    .select('*')
    .eq('user_id', dbUserId)
    .limit(1);

  if (error) {
    console.error('[Timeline Coach] Failed to fetch preference profile', error);
    return null;
  }

  const row = data?.[0];
  if (!row) return null;

  return {
    userId,
    domainWeights: row.domain_weights ?? {},
    riskTolerance: row.risk_tolerance ?? {},
    timePreferences: row.time_preferences ?? {},
    comfortZones: row.comfort_zones ?? {},
    sacrificePreferences: row.sacrifice_preferences ?? {},
    summary: row.summary ?? undefined,
  };
}


