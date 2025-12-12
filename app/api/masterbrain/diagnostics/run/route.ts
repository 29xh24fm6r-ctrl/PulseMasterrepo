// Master Brain - Run Diagnostics API
// app/api/masterbrain/diagnostics/run/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { runDiagnostics } from '@/lib/masterbrain/diagnostics';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { runType } = body;

    const result = await runDiagnostics({
      runType: (runType ?? 'manual') as 'daily' | 'manual' | 'post_deploy',
      initiatedBy: userId ? `user:${userId}` : 'system',
    });

    return NextResponse.json({
      runId: result.run.id,
      summary: result.run.summary,
      findings: result.findings,
    });
  } catch (err) {
    console.error('[API] Master Brain diagnostics run failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to run diagnostics' },
      { status: 500 }
    );
  }
}


