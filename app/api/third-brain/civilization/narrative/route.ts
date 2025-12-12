// Third Brain Graph v4 - Civilization Narrative API
// app/api/third-brain/civilization/narrative/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCivilizationSnapshotNarrative } from '@/lib/thirdbrain/civilization/narrator';

async function resolveUserId(clerkId: string): Promise<string> {
  const { supabaseAdminClient } = await import('@/lib/supabase/admin');
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

    const narrative = await getCivilizationSnapshotNarrative(userId);

    return NextResponse.json({ narrative });
  } catch (err) {
    console.error('[API] Third Brain civilization narrative failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate narrative' },
      { status: 500 }
    );
  }
}


