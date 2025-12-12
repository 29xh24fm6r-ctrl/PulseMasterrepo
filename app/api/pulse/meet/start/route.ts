// Meet Pulse - Start Session API
// app/api/pulse/meet/start/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { startMeetPulseSession } from '@/lib/meet_pulse/onboarding_flow';

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const result = await startMeetPulseSession(userId, now);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Meet Pulse start failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start Meet Pulse session' },
      { status: 500 }
    );
  }
}


