// Conscious Console - Surface Insights API
// app/api/pulse/console/surface/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { generateBrainSurfaceEventsFromLatestData } from '@/lib/conscious_console/surface_insights';

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await generateBrainSurfaceEventsFromLatestData(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Conscious Console surface failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate surface events' },
      { status: 500 }
    );
  }
}


