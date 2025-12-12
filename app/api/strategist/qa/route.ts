// Meet the Strategist - Q&A API
// app/api/strategist/qa/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { answerStrategistQuestion } from '@/lib/strategic_mind/v1/strategist_ux/explain';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { question } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'question required' }, { status: 400 });
    }

    const answer = await answerStrategistQuestion(userId, question);

    return NextResponse.json({ answer });
  } catch (err) {
    console.error('[API] Strategist Q&A failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to answer question' },
      { status: 500 }
    );
  }
}


