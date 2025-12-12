// Life Canon - Run Snapshot API
// app/api/life-canon/snapshot/run/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { refreshLifeCanonForUser } from '@/lib/life_canon/v1/canon_updater';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await refreshLifeCanonForUser(userId, new Date());

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API] Life Canon snapshot failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create snapshot' },
      { status: 500 }
    );
  }
}


