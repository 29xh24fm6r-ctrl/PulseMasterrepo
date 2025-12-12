// Conscious Console - Status API
// app/api/pulse/console/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { buildConsciousConsolePayload } from '@/lib/conscious_console/status';

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await buildConsciousConsolePayload(userId);

    return NextResponse.json(payload);
  } catch (error) {
    console.error('[API] Conscious Console failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to build console payload' },
      { status: 500 }
    );
  }
}


