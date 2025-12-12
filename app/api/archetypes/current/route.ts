// Archetype Engine - Get Current State API
// app/api/archetypes/current/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdminClient } from '@/lib/supabase';

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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUserId = await resolveUserId(userId);

    const [profileRes, snapshotRes] = await Promise.all([
      supabaseAdminClient
        .from('user_archetype_profiles')
        .select('*')
        .eq('user_id', dbUserId)
        .maybeSingle(),
      supabaseAdminClient
        .from('archetype_snapshots')
        .select('*')
        .eq('user_id', dbUserId)
        .order('snapshot_time', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      profile: profileRes.data,
      latestSnapshot: snapshotRes.data,
    });
  } catch (err) {
    console.error('[API] Get archetype current failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch current archetypes' },
      { status: 500 }
    );
  }
}


