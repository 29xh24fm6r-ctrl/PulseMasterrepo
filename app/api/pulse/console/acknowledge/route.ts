// Conscious Console - Acknowledge Event API
// app/api/pulse/console/acknowledge/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { acknowledgeSurfaceEvent } from '@/lib/conscious_console/acknowledgements';

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { surfaceEventId, reaction, notes, followupPrefsPatch } = body;

    if (!surfaceEventId || !reaction) {
      return NextResponse.json({ error: 'Missing surfaceEventId or reaction' }, { status: 400 });
    }

    await acknowledgeSurfaceEvent(
      userId,
      surfaceEventId,
      reaction,
      notes,
      followupPrefsPatch
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Conscious Console acknowledge failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to acknowledge event' },
      { status: 500 }
    );
  }
}


