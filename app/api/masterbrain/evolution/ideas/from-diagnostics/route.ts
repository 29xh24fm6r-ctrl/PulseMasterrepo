// Master Brain Evolution - Generate Ideas from Diagnostics API
// app/api/masterbrain/evolution/ideas/from-diagnostics/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateImprovementIdeasFromDiagnostics } from '@/lib/masterbrain/evolution/ideas';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { diagnosticsRunId } = body;

    if (!diagnosticsRunId) {
      return NextResponse.json({ error: 'diagnosticsRunId required' }, { status: 400 });
    }

    const ideas = await generateImprovementIdeasFromDiagnostics(diagnosticsRunId);

    return NextResponse.json({ ideas });
  } catch (err) {
    console.error('[API] Master Brain evolution ideas generation failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate ideas' },
      { status: 500 }
    );
  }
}


