// Destiny Engine v2 - Anchor API
// app/api/destiny/anchor/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { setDestinyAnchor, getCurrentDestinyAnchor } from '@/lib/destiny/anchor';
import { supabaseAdminClient } from '@/lib/supabase/admin';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(clerkId);

    const anchor = await getCurrentDestinyAnchor(userId);

    return NextResponse.json({ anchor });
  } catch (err) {
    console.error('[API] Destiny anchor get failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get anchor' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(clerkId);

    const body = await req.json();
    const { timelineId, strength, notes } = body;

    if (!timelineId) {
      return NextResponse.json({ error: 'timelineId required' }, { status: 400 });
    }

    await setDestinyAnchor({
      userId,
      timelineId,
      strength,
      notes,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API] Destiny anchor set failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to set anchor' },
      { status: 500 }
    );
  }
}


