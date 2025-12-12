// Third Brain Graph v4 - Graph Search API
// app/api/third-brain/graph/search/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { searchGraph } from '@/lib/thirdbrain/graph/query';
import { NodeKind } from '@/lib/thirdbrain/graph/types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { supabaseAdminClient } = await import('@/lib/supabase/admin');
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
    const query = searchParams.get('q');
    const kindParam = searchParams.get('kind');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!query) {
      return NextResponse.json({ error: 'q (query) required' }, { status: 400 });
    }

    const kindFilter: NodeKind[] | undefined = kindParam
      ? (kindParam.split(',') as NodeKind[])
      : undefined;

    const result = await searchGraph({
      userId,
      query,
      kindFilter,
      limit,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API] Third Brain graph search failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to search graph' },
      { status: 500 }
    );
  }
}


