// Workspace State API
// app/api/workspace/state/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);

    const dbUserId = await resolveUserId(userId);

    const { data: stateRows, error: stateError } = await supabaseAdmin
      .from('workspace_state')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('state_date', date)
      .limit(1);

    if (stateError) {
      return NextResponse.json({ error: stateError.message }, { status: 500 });
    }

    const state = stateRows?.[0] ?? null;

    let threads: any[] = [];

    if (state?.active_thread_ids?.length) {
      const { data: threadRows, error: threadError } = await supabaseAdmin
        .from('workspace_threads')
        .select('*')
        .in('id', state.active_thread_ids)
        .order('importance', { ascending: false })
        .order('urgency', { ascending: false });

      if (threadError) {
        return NextResponse.json({ error: threadError.message }, { status: 500 });
      }

      threads = threadRows || [];
    }

    return NextResponse.json({ state, threads });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


