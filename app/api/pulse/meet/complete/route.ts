// Meet Pulse - Complete Session API
// app/api/pulse/meet/complete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { completeMeetPulseSession } from '@/lib/meet_pulse/onboarding_flow';

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, userReaction } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    await completeMeetPulseSession(userId, sessionId, userReaction);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Meet Pulse complete failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete session' },
      { status: 500 }
    );
  }
}


