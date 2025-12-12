// Generate Chapter API
// app/api/thirdbrain/chapters/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateChapterForPeriod } from '@/lib/thirdbrain/graph/chapters';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { periodStart, periodEnd } = body;

    if (!periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'periodStart and periodEnd are required' },
        { status: 400 }
      );
    }

    const chapterId = await generateChapterForPeriod(userId, periodStart, periodEnd);

    return NextResponse.json({ chapterId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


