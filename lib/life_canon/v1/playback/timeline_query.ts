// Life Canon Playback v1 - Timeline Query Helpers
// lib/life_canon/v1/playback/timeline_query.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function getLifeTimelineForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const [chaptersRes, eventsRes, transformsRes] = await Promise.all([
    supabaseAdmin
      .from('life_chapters')
      .select('*')
      .eq('user_id', dbUserId)
      .order('chapter_order', { ascending: true }),
    supabaseAdmin
      .from('canon_events')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('identity_transforms')
      .select('*')
      .eq('user_id', dbUserId)
      .order('occurred_at', { ascending: true }),
  ]);

  return {
    chapters: chaptersRes.data ?? [],
    events: eventsRes.data ?? [],
    transforms: transformsRes.data ?? [],
  };
}

export async function getCurrentCanonSnapshot(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data } = await supabaseAdmin
    .from('life_canon_snapshots')
    .select('*')
    .eq('user_id', dbUserId)
    .order('snapshot_time', { ascending: false })
    .limit(1);

  return data?.[0] ?? null;
}


