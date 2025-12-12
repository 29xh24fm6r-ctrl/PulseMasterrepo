// Archetype Engine - Get Chapter Archetypes API
// app/api/archetypes/chapters/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdminClient } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUserId = await resolveUserId(userId);

    const [chaptersRes, archetypesRes] = await Promise.all([
      supabaseAdminClient
        .from('life_chapters')
        .select('*')
        .eq('user_id', dbUserId)
        .order('chapter_order', { ascending: true }),
      supabaseAdminClient
        .from('chapter_archetypes')
        .select('*')
        .eq('user_id', dbUserId),
    ]);

    const chapters = chaptersRes.data ?? [];
    const archetypes = archetypesRes.data ?? [];

    const archetypesByChapter = Object.fromEntries(
      archetypes.map((a: any) => [a.chapter_id, a])
    );

    const result = chapters.map((chapter: any) => ({
      chapter,
      archetypes: archetypesByChapter[chapter.id] ?? null,
    }));

    return NextResponse.json({ chapters: result });
  } catch (err) {
    console.error('[API] Get archetype chapters failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch chapter archetypes' },
      { status: 500 }
    );
  }
}


