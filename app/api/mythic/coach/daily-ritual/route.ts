// Mythic Coach - Daily Ritual API
// app/api/mythic/coach/daily-ritual/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateMythicCoachResponse } from '@/lib/mythic/coach/generate';
import { logMythicCoachSession } from '@/lib/mythic/coach/log';
import { buildMythicContext } from '@/lib/mythic/coach/context';
import { updateMythicCoachSettings } from '@/lib/mythic/coach/settings';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { source } = body; // 'weekly_planner' or 'morning_briefing'

    // Generate response
    const result = await generateMythicCoachResponse({
      userId,
      mode: 'daily_ritual',
      userMessage: undefined,
    });

    // Build context for logging
    const context = await buildMythicContext({ userId });

    // Log session
    await logMythicCoachSession({
      userId,
      mode: 'daily_ritual',
      source: source || 'weekly_planner',
      context,
      response: result.response,
      usedPlaybooks: result.usedPlaybooks,
      inputSummary: 'Daily ritual check-in',
    }).catch((err) => {
      console.error('[Mythic Coach] Logging failed', err);
    });

    // Update last daily ritual timestamp
    await updateMythicCoachSettings(userId, {
      last_daily_ritual_at: new Date().toISOString(),
    } as any).catch((err) => {
      console.error('[Mythic Coach] Settings update failed', err);
    });

    return NextResponse.json({
      response: result.response,
      metadata: {
        lifeChapterId: result.lifeChapterId,
        dominantArchetypeId: result.dominantArchetypeId,
        usedPlaybookIds: result.usedPlaybooks.map((pb) => pb.id),
      },
    });
  } catch (err) {
    console.error('[API] Mythic Coach daily ritual failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate daily ritual' },
      { status: 500 }
    );
  }
}


