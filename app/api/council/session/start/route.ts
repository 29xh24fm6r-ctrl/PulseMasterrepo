// Executive Council - Start Session API
// app/api/council/session/start/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { startCouncilSession } from '@/lib/executive_council/v1/orchestrator';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { topic, question, timescale, importance, context, triggerSource } = body;

    if (!topic || !question) {
      return NextResponse.json(
        { error: 'topic and question required' },
        { status: 400 }
      );
    }

    const result = await startCouncilSession(userId, new Date(), {
      topic,
      question,
      timescale,
      importance,
      rawContext: context,
      triggerSource: triggerSource ?? 'user_request',
    });

    return NextResponse.json({
      sessionId: result.sessionId,
      consensusId: result.consensusId,
      consensus: result.consensus,
      opinions: result.opinions,
      context: result.context,
    });
  } catch (err) {
    console.error('[API] Start council session failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start council session' },
      { status: 500 }
    );
  }
}


