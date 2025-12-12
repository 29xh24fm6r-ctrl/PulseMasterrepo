// Mythic Coach - Message API
// app/api/mythic/coach/message/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateMythicCoachResponse } from '@/lib/mythic/coach/generate';
import { logMythicCoachSession } from '@/lib/mythic/coach/log';
import { buildMythicContext } from '@/lib/mythic/coach/context';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { mode, userMessage, dealId } = body;

    if (!mode) {
      return NextResponse.json({ error: 'mode required' }, { status: 400 });
    }

    // Generate response
    const result = await generateMythicCoachResponse({
      userId,
      mode: mode as 'ad_hoc' | 'daily_ritual' | 'deal_review' | 'crisis',
      userMessage,
      dealId,
    });

    // Build context for logging
    const context = await buildMythicContext({ userId, dealId });

    // Log session
    await logMythicCoachSession({
      userId,
      mode: mode as 'ad_hoc' | 'daily_ritual' | 'deal_review' | 'crisis',
      source: 'user_opening_app',
      context,
      dealId,
      dealArchetypeRunId: result.dealArchetypeRunId,
      response: result.response,
      usedPlaybooks: result.usedPlaybooks,
      inputSummary: userMessage,
    }).catch((err) => {
      console.error('[Mythic Coach] Logging failed', err);
    });

    return NextResponse.json({
      response: result.response,
      metadata: {
        lifeChapterId: result.lifeChapterId,
        dominantArchetypeId: result.dominantArchetypeId,
        dealArchetypeRunId: result.dealArchetypeRunId,
        usedPlaybookIds: result.usedPlaybooks.map((pb) => pb.id),
      },
    });
  } catch (err) {
    console.error('[API] Mythic Coach message failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate response' },
      { status: 500 }
    );
  }
}


