// Archetype Engine - Run Snapshot API
// app/api/archetypes/snapshot/run/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { runArchetypeSnapshotForUser } from '@/lib/archetypes/v2/snapshots';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runArchetypeSnapshotForUser(userId, new Date());

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API] Archetype snapshot failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to run archetype snapshot' },
      { status: 500 }
    );
  }
}


