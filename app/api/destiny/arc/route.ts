// Destiny Arc API
// app/api/destiny/arc/route.ts

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

    const dbUserId = await resolveUserId(userId);

    const { data: arcs, error: arcError } = await supabaseAdmin
      .from('destiny_arcs')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('is_current', true)
      .limit(1);

    if (arcError) {
      return NextResponse.json({ error: arcError.message }, { status: 500 });
    }

    const arc = arcs?.[0] ?? null;

    if (!arc) {
      return NextResponse.json({ arc: null, checkpoints: [] });
    }

    const { data: checkpoints, error: checkpointError } = await supabaseAdmin
      .from('destiny_checkpoints')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('arc_id', arc.id)
      .order('target_date', { ascending: true });

    if (checkpointError) {
      return NextResponse.json({ error: checkpointError.message }, { status: 500 });
    }

    return NextResponse.json({ arc, checkpoints: checkpoints ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


