// Boardroom Brain - Decision Review API
// app/api/boardroom/decisions/[id]/review/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { runBoardroomReview } from '@/lib/boardroom/orchestrator';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runBoardroomReview({
      userId,
      decisionId: params.id,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API] Boardroom decision review failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to run boardroom review' },
      { status: 500 }
    );
  }
}


