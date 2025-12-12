// Cortex Refresh API (Manual trigger)
// app/api/cortex/refresh/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { refreshDailyWorkSignalsForUser } from '@/lib/cortex/signals';
import { refreshWorkPatternsForUser } from '@/lib/cortex/patterns';
import { refreshWorkSkillsForUser } from '@/lib/cortex/skills';
import { detectWorkAnomaliesForUser, refreshWorkPredictionsForUser } from '@/lib/cortex/predict';
import { startOfToday } from 'date-fns';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = startOfToday();

    // Run all refresh functions
    await refreshDailyWorkSignalsForUser(userId, today);
    await refreshWorkPatternsForUser(userId);
    await refreshWorkSkillsForUser(userId);
    await detectWorkAnomaliesForUser(userId, today);
    await refreshWorkPredictionsForUser(userId, today);

    return NextResponse.json({ ok: true, message: 'Cortex refreshed successfully' });
  } catch (err: any) {
    console.error('[Cortex] Refresh error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


