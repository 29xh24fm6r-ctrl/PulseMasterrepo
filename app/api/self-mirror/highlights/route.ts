// Self Mirror Highlights API
// app/api/self-mirror/highlights/route.ts

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
    const snapshotId = searchParams.get('snapshotId');
    const deltaId = searchParams.get('deltaId');
    const limit = parseInt(searchParams.get('limit') || '20');

    const dbUserId = await resolveUserId(userId);

    let query = supabaseAdmin
      .from('self_mirror_highlights')
      .select('*')
      .eq('user_id', dbUserId)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false });

    if (snapshotId) {
      query = query.eq('snapshot_id', snapshotId);
    }

    if (deltaId) {
      query = query.eq('delta_id', deltaId);
    }

    const { data, error } = await query.limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ highlights: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


