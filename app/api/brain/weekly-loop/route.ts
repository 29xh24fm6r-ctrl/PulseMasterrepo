// Weekly Brain Loop API (Dev endpoint)
// app/api/brain/weekly-loop/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { runWeeklyBrainLoopForUser } from '@/lib/brain/brainstem';
import { endOfToday } from 'date-fns';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const weekEndStr = body.weekEnd;

    const weekEnd = weekEndStr ? new Date(weekEndStr) : endOfToday();

    await runWeeklyBrainLoopForUser(userId, weekEnd);

    return NextResponse.json({ ok: true, message: 'Weekly brain loop completed' });
  } catch (err: any) {
    console.error('[Brain] Weekly loop error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


