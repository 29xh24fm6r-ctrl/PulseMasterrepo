// Conscious Workspace v1 - Daily Projection API
// app/api/workspace/day/project/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateDailyTimelineView } from '@/lib/workspace/daily_projection';
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
    const { date, timelineId, branchRunId } = body;

    if (!date) {
      return NextResponse.json({ error: 'date required' }, { status: 400 });
    }

    const view = await generateDailyTimelineView({
      userId,
      date: new Date(date),
      timelineId,
      branchRunId,
    });

    return NextResponse.json({ view });
  } catch (err) {
    console.error('[API] Daily projection failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate projection' },
      { status: 500 }
    );
  }
}


