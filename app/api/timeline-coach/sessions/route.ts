// Timeline Coach v1 - Sessions List API
// app/api/timeline-coach/sessions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

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

    const { data: sessions, error } = await supabaseAdmin
      .from('timeline_coach_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ sessions: sessions ?? [] });
  } catch (err) {
    console.error('[API] Timeline coach sessions list failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list sessions' },
      { status: 500 }
    );
  }
}


