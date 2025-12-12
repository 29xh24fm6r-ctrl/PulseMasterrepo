// Narrative Current Context API
// app/api/narrative/current/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCurrentNarrativeContextForUser } from '@/lib/narrative/context';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const context = await getCurrentNarrativeContextForUser(userId);

    return NextResponse.json(context);
  } catch (err: any) {
    console.error('[Narrative] Error getting current context', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


