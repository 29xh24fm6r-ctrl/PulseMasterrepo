// Meet the Strategist - Complete Session API
// app/api/strategist/session/complete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { completeStrategistSession } from '@/lib/strategic_mind/v1/strategist_ux/session';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, userReaction } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    await completeStrategistSession(userId, sessionId, userReaction);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API] Complete strategist session failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to complete session' },
      { status: 500 }
    );
  }
}


