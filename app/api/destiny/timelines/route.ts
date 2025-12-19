// Destiny Engine v2 - Timelines API
// app/api/destiny/timelines/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createCustomTimeline } from '@/lib/destiny/builder';
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
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(clerkId);

    const { data: timelines, error: timelinesError } = await supabaseAdmin
      .from('destiny_timelines')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (timelinesError) throw timelinesError;

    // Get latest scores for each timeline
    const timelinesWithScores = await Promise.all(
      (timelines ?? []).map(async (timeline) => {
        const { data: latestScore } = await supabaseAdmin
          .from('destiny_timeline_scores')
          .select('*')
          .eq('timeline_id', timeline.id)
          .order('snapshot_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...timeline,
          latest_score: latestScore ?? null,
        };
      })
    );

    return NextResponse.json({ timelines: timelinesWithScores });
  } catch (err) {
    console.error('[API] Destiny timelines list failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list timelines' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(clerkId);

    const body = await req.json();
    const { name, description, timeHorizonYears, primaryDomains, archetype, mythicFrame } = body;

    if (!name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }

    const timeline = await createCustomTimeline({
      userId,
      name,
      description,
      timeHorizonYears,
      primaryDomains,
      archetype,
      mythicFrame,
    });

    return NextResponse.json({ timeline });
  } catch (err) {
    console.error('[API] Destiny timeline creation failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create timeline' },
      { status: 500 }
    );
  }
}


