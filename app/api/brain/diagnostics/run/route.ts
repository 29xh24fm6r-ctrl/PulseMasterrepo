// Brain Diagnostics Run API
// app/api/brain/diagnostics/run/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { computeBrainHealthSnapshotForUser } from '@/lib/brain/registry/health';
import { generateBrainDiagnosticsForUser } from '@/lib/brain/registry/diagnostics';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const { snapshotId } = await computeBrainHealthSnapshotForUser(userId, now);
    const diagnostics = await generateBrainDiagnosticsForUser(userId, snapshotId);

    return NextResponse.json({
      snapshotId,
      diagnostics,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


