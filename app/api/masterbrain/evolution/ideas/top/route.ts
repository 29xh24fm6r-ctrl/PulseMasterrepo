// Master Brain Evolution - Top Ideas API
// app/api/masterbrain/evolution/ideas/top/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getTopUpgradeSuggestions } from '@/lib/masterbrain/evolution/suggestions';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const suggestions = await getTopUpgradeSuggestions(limit);

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error('[API] Master Brain evolution top suggestions failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}


