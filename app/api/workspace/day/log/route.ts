// Conscious Workspace v1 - Day Log API
// app/api/workspace/day/log/route.ts

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

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(clerkId);

    const searchParams = req.nextUrl.searchParams;
    const dateParam = searchParams.get('date') || new Date().toISOString().slice(0, 10);

    const { data: dayLog, error } = await supabaseAdminClient
      .from('workspace_day_log')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateParam)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ dayLog: dayLog ?? null });
  } catch (err) {
    console.error('[API] Day log get failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get day log' },
      { status: 500 }
    );
  }
}


