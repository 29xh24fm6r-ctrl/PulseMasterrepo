// Self Mirror Snapshot Builder
// lib/self_mirror/snapshot.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { SelfMirrorSnapshot } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const SELF_MIRROR_SNAPSHOT_PROMPT = `
You are the Global Sense of Self Mirror.

You see:
- Identity profile (who the user says they are and want to be).
- Destiny context (long-term blueprint + current arc).
- Narrative snapshot (current chapter, themes).
- Value profile.
- Wisdom/meta-learning summary (what tends to work for them).
- Emotion & somatic snapshots.
- Social state snapshot (relationship health).

Your job:
1. Synthesize a snapshot of "who they are being lately":
   - identityState
   - destinyState
   - narrativeState
   - valuesAlignment (per key value)
   - behaviorProfile (how they've actually been acting)
   - emotionalProfile
   - relationalProfile
   - somaticProfile

2. Quantify:
   - overallAlignment (0..1) — how closely their lived behavior matches their stated identity/destiny/values.
   - driftScore (0..1) — how far they're drifting off their chosen path.
   - selfCompassionScore (0..1) — are they being harsh vs kind to themselves.

3. Provide:
   - narrativeSummary: a kind, honest description of who they are this week.
   - mirrorInsights: structured insights for coaching (wins, concerns, patterns).

Be gentle, non-judgmental, and constructive.

Return JSON: { "snapshot": { ... } }.

Only return valid JSON.`;

async function getIdentityProfileForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  try {
    const { getIdentityProfile } = await import('@/lib/identity-engine');
    return await getIdentityProfile(userId);
  } catch (err) {
    // Identity engine might not be available
  }

  return null;
}

async function getCurrentDestinyContextForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data: arcs } = await supabaseAdmin
    .from('destiny_arcs')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('is_current', true)
    .limit(1);

  const { data: blueprints } = await supabaseAdmin
    .from('destiny_blueprints')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('is_primary', true)
    .limit(1);

  return {
    arc: arcs?.[0] ?? null,
    blueprint: blueprints?.[0] ?? null,
  };
}

async function getLatestNarrativeSnapshotForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data } = await supabaseAdmin
    .from('narrative_snapshots')
    .select('*')
    .eq('user_id', dbUserId)
    .order('snapshot_at', { ascending: false })
    .limit(1);

  return data?.[0] ?? null;
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

  return {
    topLessons: (lessons || []).slice(0, 5).map((l: any) => ({
      title: l.title,
      summary: l.summary,
      strength: l.strength,
    })),
  };
}

async function getLatestEmotionStateForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data } = await supabaseAdmin
    .from('emotion_state_daily')
    .select('*')
    .eq('user_id', dbUserId)
    .order('state_date', { ascending: false })
    .limit(1);

  return data?.[0] ?? null;
}

export async function createSelfMirrorSnapshotForUser(userId: string, date: Date) {
  const day = date.toISOString().slice(0, 10);
  const dbUserId = await resolveUserId(userId);

  const [
    identity,
    destiny,
    narrative,
    valueProfile,
    wisdom,
    emotion,
    somaticMetrics,
    { data: socialStateRows },
  ] = await Promise.all([
    getIdentityProfileForUser(userId).catch(() => null),
    getCurrentDestinyContextForUser(userId).catch(() => null),
    getLatestNarrativeSnapshotForUser(userId).catch(() => null),
    getValueProfileForUser(userId).catch(() => null),
    getWisdomMetaSummaryForUser(userId).catch(() => null),
    getLatestEmotionStateForUser(userId).catch(() => null),
    (async () => {
      const { getSomaticSnapshotForUser } = await import('@/lib/somatic/v2/context');
      return await getSomaticSnapshotForUser(userId, date).catch(() => null);
    })(),
    supabaseAdmin
      .from('social_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('snapshot_date', day)
      .limit(1),
  ]);

  const socialState = socialStateRows?.[0] ?? null;

  const result = await callAIJson<{ snapshot: SelfMirrorSnapshot }>({
    userId,
    feature: 'self_mirror_snapshot',
    systemPrompt: SELF_MIRROR_SNAPSHOT_PROMPT,
    userPrompt: JSON.stringify({
      date: day,
      identity: identity ? {
        values: identity.values || [],
        roles: identity.roles || [],
        strengths: identity.strengths || [],
      } : null,
      destiny: destiny ? {
        arc: destiny.arc ? {
          name: destiny.arc.name,
          logline: destiny.arc.logline,
          focusDomains: destiny.arc.focus_domains,
        } : null,
        blueprint: destiny.blueprint ? {
          name: destiny.blueprint.name,
          tagline: destiny.blueprint.tagline,
        } : null,
      } : null,
      narrative: narrative ? {
        shortLogline: narrative.short_logline,
        tensions: narrative.tensions || [],
        opportunities: narrative.opportunities || [],
      } : null,
      valueProfile: valueProfile ? {
        summary: valueProfile.summary,
        coreValues: valueProfile.core_values || [],
        rolePriorities: valueProfile.role_priorities || {},
      } : null,
      wisdom,
      emotion: emotion ? {
        stressScore: emotion.stress_score,
        resilienceScore: emotion.resilience_score,
      } : null,
      somatic: somaticMetrics ? {
        energyScore: somaticMetrics.energy_score,
        fatigueScore: somaticMetrics.fatigue_score,
        recoveryScore: somaticMetrics.recovery_score,
      } : null,
      socialState: socialState ? {
        overallHealth: socialState.overall_health,
        overallTension: socialState.overall_tension,
        overallDrift: socialState.overall_drift,
        narrativeSummary: socialState.narrative_summary,
      } : null,
    }, null, 2),
    maxTokens: 3500,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Self Mirror] Failed to generate snapshot', result.error);
    return;
  }

  const { snapshot } = result.data;

  const { data, error } = await supabaseAdmin
    .from('self_mirror_snapshots')
    .upsert(
      {
        user_id: dbUserId,
        snapshot_date: day,
        identity_state: snapshot.identityState ?? {},
        destiny_state: snapshot.destinyState ?? {},
        narrative_state: snapshot.narrativeState ?? {},
        values_alignment: snapshot.valuesAlignment ?? {},
        behavior_profile: snapshot.behaviorProfile ?? {},
        emotional_profile: snapshot.emotionalProfile ?? {},
        relational_profile: snapshot.relationalProfile ?? {},
        somatic_profile: snapshot.somaticProfile ?? {},
        overall_alignment: snapshot.overallAlignment,
        drift_score: snapshot.driftScore,
        self_compassion_score: snapshot.selfCompassionScore,
        narrative_summary: snapshot.narrativeSummary ?? null,
        mirror_insights: snapshot.mirrorInsights ?? {},
      },
      { onConflict: 'user_id,snapshot_date' }
    )
    .select('id');

  if (error) {
    console.error('[Self Mirror] Failed to upsert snapshot', error);
    throw error;
  }
  return data?.[0]?.id as string;
}


