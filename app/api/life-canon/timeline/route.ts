// Life Canon - Get Timeline API
// app/api/life-canon/timeline/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
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

    const [chaptersRes, eventsRes] = await Promise.all([
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
    ]);

    return NextResponse.json({
      chapters: chaptersRes.data ?? [],
      events: eventsRes.data ?? [],
    });
  } catch (err) {
    console.error('[API] Get Life Canon timeline failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch timeline' },
      { status: 500 }
    );
  }
}


