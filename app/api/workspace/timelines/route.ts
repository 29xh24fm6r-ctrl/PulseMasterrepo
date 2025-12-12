// Workspace Timeline Links API
// app/api/workspace/timelines/route.ts

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
    const stateDate = searchParams.get('date');

    const today = new Date();
    const day = stateDate ?? today.toISOString().slice(0, 10);

    const dbUserId = await resolveUserId(userId);

    const { data, error } = await supabaseAdmin
      .from('workspace_timeline_links')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('state_date', day);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ links: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


