// Conscious Workspace v1 - Daily Compare API
// app/api/workspace/day/compare/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { compareDailyTimelines } from '@/lib/workspace/multiverse_day';
import { supabaseAdminClient } from '@/lib/supabase/admin';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(clerkId);

    const body = await req.json();
    const { date, timelineIds } = body;

    if (!date || !timelineIds || timelineIds.length === 0) {
      return NextResponse.json(
        { error: 'date and timelineIds required' },
        { status: 400 }
      );
    }

    const views = await compareDailyTimelines({
      userId,
      date: new Date(date),
      timelineIds,
    });

    return NextResponse.json({ views });
  } catch (err) {
    console.error('[API] Daily compare failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to compare timelines' },
      { status: 500 }
    );
  }
}


