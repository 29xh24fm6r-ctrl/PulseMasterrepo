// Workspace v2 State API
// app/api/workspace/v2/state/route.ts

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

    const dbUserId = await resolveUserId(userId);

    const { data: states, error: stateError } = await supabaseAdmin
      .from('workspace_state')
      .select('*')
      .eq('user_id', dbUserId)
      .order('state_date', { ascending: false })
      .limit(1);

    if (stateError) {
      return NextResponse.json({ error: stateError.message }, { status: 500 });
    }

    const state = states?.[0] ?? null;

    if (!state) {
      return NextResponse.json({ state: null, threads: [] });
    }

    const { data: threads, error: threadError } = await supabaseAdmin
      .from('workspace_threads')
      .select('*')
      .eq('user_id', dbUserId)
      .in('id', state.active_thread_ids || []);

    if (threadError) {
      return NextResponse.json({ error: threadError.message }, { status: 500 });
    }

    return NextResponse.json({ state, threads: threads ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


