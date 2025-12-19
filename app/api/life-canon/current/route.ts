// Life Canon - Get Current State API
// app/api/life-canon/current/route.ts

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

    // Get latest snapshot
    const { data: snapshot } = await supabaseAdmin
      .from('life_canon_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!snapshot) {
      return NextResponse.json({
        chapter: null,
        recentEvents: [],
        themes: { rising: [], fading: [] },
        summary: null,
        predictedNextChapter: null,
        turningPoints: [],
      });
    }

    return NextResponse.json({
      chapter: snapshot.active_chapter,
      recentEvents: snapshot.recent_events ?? [],
      themes: snapshot.active_themes ?? { rising: [], fading: [] },
      summary: snapshot.narrative_summary,
      predictedNextChapter: snapshot.predicted_next_chapter,
      turningPoints: snapshot.upcoming_turning_points ?? [],
    });
  } catch (err) {
    console.error('[API] Get Life Canon current failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch current state' },
      { status: 500 }
    );
  }
}


