// Timeline Coach Decision API
// app/api/timeline-coach/decide/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { proposeTimelineDecisionForUser } from '@/lib/timeline_coach/coach';
import { saveTimelineDecisionForUser } from '@/lib/timeline_coach/commitments';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const autoPropose = body.autoPropose ?? false;

    let decisionBlueprint;
    if (autoPropose) {
      decisionBlueprint = await proposeTimelineDecisionForUser(userId);
    } else {
      // User provided decision directly
      decisionBlueprint = body.decision;
    }

    if (!decisionBlueprint) {
      return NextResponse.json({ error: 'No decision available' }, { status: 400 });
    }

    const { decisionId } = await saveTimelineDecisionForUser(userId, decisionBlueprint);

    return NextResponse.json({ success: true, decisionId, decision: decisionBlueprint });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


