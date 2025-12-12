// Mythic Coach - Run Reflection API
// app/api/mythic-coach/reflection/run/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { runMythicReflectionForWeek } from '@/lib/mythic_coach/v1/reflection_engine';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { archetypeId, periodStart, periodEnd } = body;

    if (!archetypeId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'archetypeId, periodStart, and periodEnd required' },
        { status: 400 }
      );
    }

    const result = await runMythicReflectionForWeek(
      userId,
      archetypeId,
      new Date(periodStart),
      new Date(periodEnd)
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API] Mythic Coach reflection failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to run reflection' },
      { status: 500 }
    );
  }
}


