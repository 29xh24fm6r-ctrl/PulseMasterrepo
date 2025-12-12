// Master Brain Evolution - Upgrade Briefing API
// app/api/masterbrain/evolution/briefing/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUpgradeBriefing } from '@/lib/masterbrain/evolution/narrator';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const briefing = await getUpgradeBriefing();

    return NextResponse.json({ briefing });
  } catch (err) {
    console.error('[API] Master Brain evolution briefing failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate briefing' },
      { status: 500 }
    );
  }
}


