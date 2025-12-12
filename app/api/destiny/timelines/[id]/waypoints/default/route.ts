// Destiny Engine v2 - Generate Default Waypoints API
// app/api/destiny/timelines/[id]/waypoints/default/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateDefaultWaypointsForTimeline } from '@/lib/destiny/builder';
import { supabaseAdminClient } from '@/lib/supabase/admin';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(clerkId);

    // Verify timeline belongs to user
    const { data: timeline } = await supabaseAdminClient
      .from('destiny_timelines')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!timeline) {
      return NextResponse.json({ error: 'Timeline not found' }, { status: 404 });
    }

    const waypoints = await generateDefaultWaypointsForTimeline(params.id);

    return NextResponse.json({ waypoints });
  } catch (err) {
    console.error('[API] Destiny waypoints generation failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate waypoints' },
      { status: 500 }
    );
  }
}


