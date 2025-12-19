// Third Brain Graph v4 - Ego Network API
// app/api/third-brain/graph/ego/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getEgoNetwork } from '@/lib/thirdbrain/graph/query';

async function resolveUserId(clerkId: string): Promise<string> {
  const { supabaseAdmin } = await import('@/lib/supabase/admin');
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

    const searchParams = req.nextUrl.searchParams;
    const nodeId = searchParams.get('nodeId');
    const depth = parseInt(searchParams.get('depth') || '2', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!nodeId) {
      return NextResponse.json({ error: 'nodeId required' }, { status: 400 });
    }

    const result = await getEgoNetwork({
      userId,
      nodeId,
      depth,
      limit,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API] Third Brain graph ego network failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch ego network' },
      { status: 500 }
    );
  }
}


