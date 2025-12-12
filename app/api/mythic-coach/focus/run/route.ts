// Mythic Coach - Run Focus API
// app/api/mythic-coach/focus/run/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { buildMythicTrainingFocus } from '@/lib/mythic_coach/v1/focus_builder';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await buildMythicTrainingFocus(userId, new Date());

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API] Mythic Coach focus failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to build focus' },
      { status: 500 }
    );
  }
}


