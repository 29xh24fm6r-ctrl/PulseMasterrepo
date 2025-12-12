// Timeline Coach Context API
// app/api/timeline-coach/context/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { buildTimelineChoiceContextForUser } from '@/lib/timeline_coach/coach';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const context = await buildTimelineChoiceContextForUser(userId);
    if (!context) {
      return NextResponse.json({ context: null });
    }

    return NextResponse.json({ context });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


