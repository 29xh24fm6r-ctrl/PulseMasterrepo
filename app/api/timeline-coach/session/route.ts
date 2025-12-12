// Timeline Coach v1 - Session API
// app/api/timeline-coach/session/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { runTimelineCoachSession } from '@/lib/timeline/coach';
import { supabaseAdminClient } from '@/lib/supabase/admin';
import { TimelineCoachMode } from '@/lib/destiny/types';

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
    const { mode, question, timelineIds } = body;

    if (!mode) {
      return NextResponse.json({ error: 'mode required' }, { status: 400 });
    }

    const session = await runTimelineCoachSession({
      userId,
      mode: mode as TimelineCoachMode,
      question,
      timelineIds,
    });

    return NextResponse.json({
      sessionId: session.id,
      response: session.response,
      summary: session.summary,
      recommendations: session.recommendations,
      followupActions: session.followup_actions,
    });
  } catch (err) {
    console.error('[API] Timeline coach session failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to run coach session' },
      { status: 500 }
    );
  }
}


