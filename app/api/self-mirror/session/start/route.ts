// Global Sense of Self Mirror v1 - Session Start API
// app/api/self-mirror/session/start/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { startSelfMirrorSession } from '@/lib/selfmirror/sessions';
import { supabaseAdminClient } from '@/lib/supabase/admin';
import { SelfMirrorMode } from '@/lib/selfmirror/types';

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
    const mode = (body.mode || 'weekly_debrief') as SelfMirrorMode;

    const session = await startSelfMirrorSession({ userId, mode });

    return NextResponse.json({ session });
  } catch (err) {
    console.error('[API] Self Mirror session start failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start session' },
      { status: 500 }
    );
  }
}


