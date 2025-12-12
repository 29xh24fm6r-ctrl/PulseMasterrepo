// Workspace Rebuild API (Manual trigger)
// app/api/workspace/rebuild/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { buildDailyWorkspaceForUser } from '@/lib/workspace/engine';
import { startOfToday } from 'date-fns';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const dateStr = body.date;

    const date = dateStr ? new Date(dateStr) : startOfToday();

    await buildDailyWorkspaceForUser(userId, date);

    return NextResponse.json({ ok: true, message: 'Workspace rebuilt successfully' });
  } catch (err: any) {
    console.error('[Workspace] Rebuild error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


