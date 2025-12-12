// Life Canon v1 - Context Builder
// lib/life_canon/v1/context.ts

import { supabaseAdminClient } from '../../supabase/admin';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function buildLifeCanonContext(userId: string, now: Date) {
  const dbUserId = await resolveUserId(userId);
  const day = now.toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  const [
    destiny,
    timelineDecisions,
    narrativeSnapshot,
    identitySnapshot,
    selfMirror,
    emotionalState,
    somaticState,
    relationships,
    councilSessions,
    strategicSnapshot,
    wisdomLessons,
  ] = await Promise.all([
    supabaseAdminClient
      .from('destiny_arcs')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdminClient
      .from('timeline_decisions')
      .select('*')
      .eq('user_id', dbUserId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false }),
    supabaseAdminClient
      .from('narrative_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdminClient
      .from('self_mirror_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdminClient
      .from('self_mirror_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(2),
    supabaseAdminClient
      .from('emotion_state_daily')
      .select('*')
      .eq('user_id', dbUserId)
      .gte('date', thirtyDaysAgo)
      .order('date', { ascending: false }),
    supabaseAdminClient
      .from('somatic_state_daily')
      .select('*')
      .eq('user_id', dbUserId)
      .gte('date', thirtyDaysAgo)
      .order('date', { ascending: false }),
    supabaseAdminClient
      .from('relational_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .gte('snapshot_time', thirtyDaysAgo)
      .order('snapshot_time', { ascending: false })
      .limit(20),
    supabaseAdminClient
      .from('council_sessions')
      .select('*')
      .eq('user_id', dbUserId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false }),
    supabaseAdminClient
      .from('strategic_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdminClient
      .from('wisdom_lessons')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  return {
    now: now.toISOString(),
    userId: dbUserId,
    destiny: destiny.data,
    timelineDecisions: timelineDecisions.data ?? [],
    narrativeSnapshot: narrativeSnapshot.data,
    identitySnapshot: identitySnapshot.data,
    selfMirror: selfMirror.data ?? [],
    emotionalState: emotionalState.data ?? [],
    somaticState: somaticState.data ?? [],
    relationships: relationships.data ?? [],
    councilSessions: councilSessions.data ?? [],
    strategicSnapshot: strategicSnapshot.data,
    wisdomLessons: wisdomLessons.data ?? [],
  };
}


