// Meet the Strategist - Feedback API
// app/api/strategist/feedback/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { submitStrategyFeedback } from '@/lib/strategic_mind/v1/strategist_ux/feedback';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { recommendationId, sessionId, reaction, notes, prefsPatch } = body;

    if (!recommendationId || !reaction) {
      return NextResponse.json(
        { error: 'recommendationId and reaction required' },
        { status: 400 }
      );
    }

    if (!['accept', 'reject', 'modify', 'defer'].includes(reaction)) {
      return NextResponse.json(
        { error: 'reaction must be one of: accept, reject, modify, defer' },
        { status: 400 }
      );
    }

    await submitStrategyFeedback(userId, {
      recommendationId,
      sessionId,
      reaction: reaction as 'accept' | 'reject' | 'modify' | 'defer',
      notes,
      prefsPatch,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API] Submit strategy feedback failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}


