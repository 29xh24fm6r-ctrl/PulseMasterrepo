// Mythic Coach - Generate Missions API
// app/api/mythic-coach/missions/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateWeeklyMissionsForPlan } from '@/lib/mythic_coach/v1/mission_builder';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { planId, weekStart } = body;

    if (!planId || !weekStart) {
      return NextResponse.json(
        { error: 'planId and weekStart required' },
        { status: 400 }
      );
    }

    const missions = await generateWeeklyMissionsForPlan(
      userId,
      planId,
      new Date(weekStart)
    );

    return NextResponse.json({ missions });
  } catch (err) {
    console.error('[API] Mythic Coach mission generation failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate missions' },
      { status: 500 }
    );
  }
}


