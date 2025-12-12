// Life Canon Playback - Overview API
// app/api/life-canon/playback/overview/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPlaybackOverview } from '@/lib/life_canon/v1/playback/playback_api';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getPlaybackOverview(userId);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API] Life Canon playback overview failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch playback overview' },
      { status: 500 }
    );
  }
}


