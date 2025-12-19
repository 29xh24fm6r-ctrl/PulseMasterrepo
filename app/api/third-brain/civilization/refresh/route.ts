// Third Brain Graph v4 - Civilization Refresh API
// app/api/third-brain/civilization/refresh/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { computeDomainStates } from '@/lib/thirdbrain/civilization/engine';

async function resolveUserId(clerkId: string): Promise<string> {
  const { supabaseAdmin } = await import('@/lib/supabase/admin');
  const { data: userRow } = await supabaseAdmin
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
    const snapshotDate = body.date ? new Date(body.date) : undefined;

    const states = await computeDomainStates(userId, snapshotDate);

    return NextResponse.json({ states });
  } catch (err) {
    console.error('[API] Third Brain civilization refresh failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to refresh civilization states' },
      { status: 500 }
    );
  }
}


