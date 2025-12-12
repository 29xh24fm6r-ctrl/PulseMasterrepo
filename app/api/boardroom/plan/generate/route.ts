// Boardroom Brain - Generate Plan API
// app/api/boardroom/plan/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateStrategicPlanDraft } from '@/lib/boardroom/strategic_mind';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { objectiveId, playbookId } = body;

    if (!objectiveId || !playbookId) {
      return NextResponse.json({ error: 'objectiveId and playbookId required' }, { status: 400 });
    }

    const plan = await generateStrategicPlanDraft({
      userId,
      objectiveId,
      selectedPlaybookId: playbookId,
    });

    return NextResponse.json({ plan });
  } catch (err) {
    console.error('[API] Boardroom plan generation failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate plan' },
      { status: 500 }
    );
  }
}


