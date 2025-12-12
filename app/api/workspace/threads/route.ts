// Workspace Threads API
// app/api/workspace/threads/route.ts

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
    const status = searchParams.get('status') || 'active';

    const dbUserId = await resolveUserId(userId);

    const { data, error } = await supabaseAdmin
      .from('workspace_threads')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('status', status)
      .order('last_touched_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ threads: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Update thread (snooze, resolve, etc.)
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { threadId, status, snoozeUntil } = body;

    if (!threadId) {
      return NextResponse.json({ error: 'threadId is required' }, { status: 400 });
    }

    const dbUserId = await resolveUserId(userId);

    const update: any = {
      last_touched_at: new Date().toISOString(),
    };

    if (status) {
      update.status = status;
    }
    if (snoozeUntil) {
      update.snooze_until = snoozeUntil;
    }

    const { error } = await supabaseAdmin
      .from('workspace_threads')
      .update(update)
      .eq('id', threadId)
      .eq('user_id', dbUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


