// Conscious Workspace v1 - Daily Views API
// app/api/workspace/day/views/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCurrentWorkspaceFocus } from '@/lib/workspace/focus';
import { getCurrentDestinyAnchor } from '@/lib/destiny/anchor';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
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

    const searchParams = req.nextUrl.searchParams;
    const dateParam = searchParams.get('date') || new Date().toISOString().slice(0, 10);
    const timelineIdsParam = searchParams.get('timelineIds');
    const branchRunIdsParam = searchParams.get('branchRunIds');

    let timelineIds: string[] | undefined;
    if (timelineIdsParam) {
      timelineIds = timelineIdsParam.split(',');
    } else if (!branchRunIdsParam) {
      // Default to current focus or anchor
      const focus = await getCurrentWorkspaceFocus(userId);
      const anchor = await getCurrentDestinyAnchor(userId);

      if (focus?.active_timeline_id) {
        timelineIds = [focus.active_timeline_id];
      } else if (anchor) {
        timelineIds = [anchor.id];
      }
    }

    let query = supabaseAdmin
      .from('daily_timeline_views')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateParam);

    if (timelineIds && timelineIds.length > 0) {
      query = query.in('timeline_id', timelineIds);
    }

    if (branchRunIdsParam) {
      const branchRunIds = branchRunIdsParam.split(',');
      query = query.in('branch_run_id', branchRunIds);
    }

    const { data: views, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ views: views ?? [] });
  } catch (err) {
    console.error('[API] Daily views get failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get views' },
      { status: 500 }
    );
  }
}


