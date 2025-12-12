// Destiny Engine v2 - Refresh Scores API
// app/api/destiny/refresh-scores/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { refreshTimelineScores } from '@/lib/destiny/scoring';
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

    const scores = await refreshTimelineScores(userId);

    return NextResponse.json({ scores });
  } catch (err) {
    console.error('[API] Destiny refresh scores failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to refresh scores' },
      { status: 500 }
    );
  }
}


