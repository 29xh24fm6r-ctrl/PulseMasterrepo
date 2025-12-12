// Global Sense of Self Mirror v1 - Snapshot API
// app/api/self-mirror/snapshot/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { buildSelfIdentitySnapshot } from '@/lib/selfmirror/snapshots';
import { recomputeSelfMirrorFacets } from '@/lib/selfmirror/facets';
import { supabaseAdminClient } from '@/lib/supabase/admin';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(clerkId);

    const body = await req.json();
    const source = body.source || 'system';

    const snapshot = await buildSelfIdentitySnapshot(userId, source);
    const facets = await recomputeSelfMirrorFacets(userId);

    return NextResponse.json({ snapshot, facets });
  } catch (err) {
    console.error('[API] Self Mirror snapshot failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to build snapshot' },
      { status: 500 }
    );
  }
}
