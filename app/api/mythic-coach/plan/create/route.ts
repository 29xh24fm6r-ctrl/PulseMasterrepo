// Mythic Coach - Create Plan API
// app/api/mythic-coach/plan/create/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createMythicPlanForTarget } from '@/lib/mythic_coach/v1/plan_builder';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { archetypeId, mode, durationDays } = body;

    if (!archetypeId || !mode || !durationDays) {
      return NextResponse.json(
        { error: 'archetypeId, mode, and durationDays required' },
        { status: 400 }
      );
    }

    const planId = await createMythicPlanForTarget(
      userId,
      { archetypeId, mode: mode as 'grow' | 'stabilize' | 'cool' },
      durationDays,
      new Date()
    );

    return NextResponse.json({ planId });
  } catch (err) {
    console.error('[API] Mythic Coach plan creation failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create plan' },
      { status: 500 }
    );
  }
}


