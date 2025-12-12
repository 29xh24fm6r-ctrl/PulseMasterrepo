// Conscious Workspace v1 - Day Finalize API
// app/api/workspace/day/finalize/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { finalizeWorkspaceDay } from '@/lib/workspace/day_log';
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
    const { date, summary } = body;

    if (!date) {
      return NextResponse.json({ error: 'date required' }, { status: 400 });
    }

    const dayLog = await finalizeWorkspaceDay({
      userId,
      date: new Date(date),
      summary,
    });

    return NextResponse.json({ dayLog });
  } catch (err) {
    console.error('[API] Day finalize failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to finalize day' },
      { status: 500 }
    );
  }
}


