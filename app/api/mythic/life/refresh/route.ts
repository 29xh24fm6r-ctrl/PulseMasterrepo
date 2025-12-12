// Mythic Intelligence - Life Refresh API
// app/api/mythic/life/refresh/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { buildLifeChaptersForUser, refreshUserMythicProfile } from '@/lib/mythic/story_extract';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chapters = await buildLifeChaptersForUser(userId);
    const profile = await refreshUserMythicProfile(userId);

    return NextResponse.json({
      chapters,
      profile,
    });
  } catch (err) {
    console.error('[API] Mythic life refresh failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to refresh life story' },
      { status: 500 }
    );
  }
}


