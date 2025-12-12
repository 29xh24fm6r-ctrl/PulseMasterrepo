// Life Canon Playback - Chapter Playback API
// app/api/life-canon/chapter/[id]/playback/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getChapterWithContext } from '@/lib/life_canon/v1/playback/chapter_view';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chapterId = params.id;
    const result = await getChapterWithContext(userId, chapterId);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API] Life Canon chapter playback failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch chapter playback' },
      { status: 500 }
    );
  }
}


