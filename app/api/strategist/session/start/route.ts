// Meet the Strategist - Start Session API
// app/api/strategist/session/start/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { startStrategistSession } from '@/lib/strategic_mind/v1/strategist_ux/session';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, explanation } = await startStrategistSession(userId);

    return NextResponse.json({
      sessionId,
      introNarrative: explanation.introNarrative,
      keyPoints: explanation.keyPoints,
      equilibrium: explanation.equilibrium,
      conflicts: explanation.conflicts,
      recommendations: explanation.recommendations,
    });
  } catch (err) {
    console.error('[API] Start strategist session failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start session' },
      { status: 500 }
    );
  }
}


