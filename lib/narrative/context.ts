// Narrative Context Helper
// lib/narrative/context.ts

import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function getCurrentNarrativeContextForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  // Current active chapter
  const { data: chapters } = await supabaseAdmin
    .from('life_chapters')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('status', 'active')
    .order('chapter_index', { ascending: false })
    .limit(1);

  const chapter = chapters?.[0] ?? null;

  // Latest snapshot
  const { data: snapshots } = await supabaseAdmin
    .from('narrative_snapshots')
    .select('*')
    .eq('user_id', dbUserId)
    .order('snapshot_at', { ascending: false })
    .limit(1);

  const snapshot = snapshots?.[0] ?? null;

  // Active themes
  const { data: themes } = await supabaseAdmin
    .from('life_themes')
    .select('*')
    .eq('user_id', dbUserId)
    .order('strength', { ascending: false })
    .limit(10);

  // Active identity arcs
  const { data: arcs } = await supabaseAdmin
    .from('identity_arcs')
    .select('*')
    .eq('user_id', dbUserId)
    .in('status', ['active'])
    .order('progress', { ascending: false });

  return {
    chapter,
    snapshot,
    themes: themes || [],
    arcs: arcs || [],
  };
}


