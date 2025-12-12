// Graph Search API
// app/api/thirdbrain/graph/search/route.ts

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
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get('q') || '';
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '10');

    const dbUserId = await resolveUserId(userId);

    let query = supabaseAdmin
      .from('tb_nodes')
      .select('*')
      .eq('user_id', dbUserId)
      .limit(limit);

    if (type) {
      query = query.eq('type', type);
    }

    if (q) {
      // Simple text search in props
      query = query.or(`props->>name.ilike.%${q}%,props->>summary.ilike.%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ nodes: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


