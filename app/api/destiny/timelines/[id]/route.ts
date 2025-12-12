// Destiny Engine v2 - Timeline Details API
// app/api/destiny/timelines/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdminClient } from '@/lib/supabase/admin';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(clerkId);

    // Get timeline
    const { data: timeline, error: timelineError } = await supabaseAdminClient
      .from('destiny_timelines')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (timelineError) throw timelineError;
    if (!timeline) {
      return NextResponse.json({ error: 'Timeline not found' }, { status: 404 });
    }

    // Get waypoints
    const { data: waypoints, error: waypointsError } = await supabaseAdminClient
      .from('destiny_waypoints')
      .select('*')
      .eq('timeline_id', params.id)
      .order('ordering', { ascending: true });

    if (waypointsError) throw waypointsError;

    // Get milestones for each waypoint
    const waypointsWithMilestones = await Promise.all(
      (waypoints ?? []).map(async (waypoint) => {
        const { data: milestones } = await supabaseAdminClient
          .from('destiny_milestones')
          .select('*')
          .eq('waypoint_id', waypoint.id)
          .order('target_date', { ascending: true });

        return {
          ...waypoint,
          milestones: milestones ?? [],
        };
      })
    );

    // Get score history
    const { data: scores, error: scoresError } = await supabaseAdminClient
      .from('destiny_timeline_scores')
      .select('*')
      .eq('timeline_id', params.id)
      .order('snapshot_at', { ascending: false })
      .limit(10);

    if (scoresError) throw scoresError;

    return NextResponse.json({
      timeline,
      waypoints: waypointsWithMilestones,
      scores: scores ?? [],
    });
  } catch (err) {
    console.error('[API] Destiny timeline details failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch timeline' },
      { status: 500 }
    );
  }
}


