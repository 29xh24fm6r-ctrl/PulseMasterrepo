// Creative Cortex v2 - Session Run API
// app/api/creative/session/run/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { runCreativeSession } from '@/lib/creative/engine';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CreativeSessionMode } from '@/lib/creative/types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
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
    const { projectId, mode, prompt, styleProfileId } = body;

    if (!prompt || !mode) {
      return NextResponse.json({ error: 'prompt and mode required' }, { status: 400 });
    }

    const result = await runCreativeSession({
      userId,
      projectId,
      mode: mode as CreativeSessionMode,
      prompt,
      styleProfileId,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API] Creative session run failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to run session' },
      { status: 500 }
    );
  }
}


