// Life Canon Playback v1 - Chapter View Helpers
// lib/life_canon/v1/playback/chapter_view.ts

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

export async function getChapterWithContext(userId: string, chapterId: string) {
  const dbUserId = await resolveUserId(userId);

  const [chapterRes, eventsRes, transformsRes] = await Promise.all([
    supabaseAdmin
      .from('life_chapters')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('id', chapterId)
      .maybeSingle(),
    supabaseAdmin
      .from('canon_events')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('attached_chapter', chapterId)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('identity_transforms')
      .select('*')
      .eq('user_id', dbUserId)
      .order('occurred_at', { ascending: true }),
  ]);

  const chapter = chapterRes.data ?? null;
  const events = eventsRes.data ?? [];

  const transforms =
    transformsRes.data?.filter((t: any) => {
      if (!chapter) return false;
      if (!chapter.start_time) return false;
      const tTime = new Date(t.occurred_at).getTime();
      const start = new Date(chapter.start_time).getTime();
      const end = chapter.end_time ? new Date(chapter.end_time).getTime() : Infinity;
      return tTime >= start && tTime <= end;
    }) ?? [];

  return {
    chapter,
    events,
    transforms,
  };
}


