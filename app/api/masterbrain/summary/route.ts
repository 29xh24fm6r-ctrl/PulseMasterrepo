// Master Brain - Summary API
// app/api/masterbrain/summary/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { summarizeDiagnosticsForUser } from '@/lib/masterbrain/narrator';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const summary = await summarizeDiagnosticsForUser(userId);

    return NextResponse.json({ summary });
  } catch (err) {
    console.error('[API] Master Brain summary failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate summary' },
      { status: 500 }
    );
  }
}


