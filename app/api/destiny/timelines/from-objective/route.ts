// Destiny Engine v2 - Create Timeline from Objective API
// app/api/destiny/timelines/from-objective/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createTimelineFromObjective } from '@/lib/destiny/builder';
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
    const { objectiveId, baseKey } = body;

    if (!objectiveId) {
      return NextResponse.json({ error: 'objectiveId required' }, { status: 400 });
    }

    const timeline = await createTimelineFromObjective({
      userId,
      objectiveId,
      baseKey,
    });

    return NextResponse.json({ timeline });
  } catch (err) {
    console.error('[API] Destiny timeline from objective failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create timeline' },
      { status: 500 }
    );
  }
}


