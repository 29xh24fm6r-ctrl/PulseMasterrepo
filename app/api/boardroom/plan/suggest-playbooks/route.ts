// Boardroom Brain - Suggest Playbooks API
// app/api/boardroom/plan/suggest-playbooks/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { suggestStrategicPlaybooks } from '@/lib/boardroom/strategic_mind';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { objectiveId } = body;

    if (!objectiveId) {
      return NextResponse.json({ error: 'objectiveId required' }, { status: 400 });
    }

    const playbooks = await suggestStrategicPlaybooks({
      userId,
      objectiveId,
    });

    return NextResponse.json({ playbooks });
  } catch (err) {
    console.error('[API] Boardroom playbook suggestion failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to suggest playbooks' },
      { status: 500 }
    );
  }
}


