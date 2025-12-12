// Emotion Log API
// app/api/emotion/log/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { recordEmotionSample } from '@/lib/emotion/engine';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { source, valence, arousal, labels, confidence, payload } = body;

    await recordEmotionSample({
      userId,
      source: source || 'self_report',
      valence,
      arousal,
      labels,
      confidence,
      payload,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


