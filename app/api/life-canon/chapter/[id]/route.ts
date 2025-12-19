// Life Canon - Get Chapter API
// app/api/life-canon/chapter/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUserId = await resolveUserId(userId);
    const chapterId = params.id;

    const { data: chapter, error } = await supabaseAdmin
      .from('life_chapters')
      .select('*')
      .eq('id', chapterId)
      .eq('user_id', dbUserId)
      .maybeSingle();

    if (error) throw error;
    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    // Get events for this chapter
    const { data: events } = await supabaseAdmin
      .from('canon_events')
      .select('*')
      .eq('attached_chapter', chapterId)
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      chapter,
      events: events ?? [],
    });
  } catch (err) {
    console.error('[API] Get Life Canon chapter failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch chapter' },
      { status: 500 }
    );
  }
}


