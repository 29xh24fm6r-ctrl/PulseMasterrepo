// Conscious Workspace v1 - Focus API
// app/api/workspace/focus/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { setWorkspaceFocus, getCurrentWorkspaceFocus } from '@/lib/workspace/focus';
import { supabaseAdminClient } from '@/lib/supabase/admin';
import { FocusMode } from '@/lib/workspace/types';

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

    const focus = await getCurrentWorkspaceFocus(userId);

    return NextResponse.json({ focus });
  } catch (err) {
    console.error('[API] Workspace focus get failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get focus' },
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
    const { activeTimelineId, activeBranchRunId, focusMode, focusTags, durationHours } = body;

    const focus = await setWorkspaceFocus({
      userId,
      activeTimelineId,
      activeBranchRunId,
      focusMode: focusMode as FocusMode,
      focusTags,
      durationHours,
    });

    return NextResponse.json({ focus });
  } catch (err) {
    console.error('[API] Workspace focus set failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to set focus' },
      { status: 500 }
    );
  }
}


