// Simulation Timelines API
// app/api/simulation/timelines/route.ts

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

    const { data: runs, error: runError } = await supabaseAdmin
      .from('simulation_runs')
      .select('id, created_at, horizon_days, seed_date, description')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (runError) {
      return NextResponse.json({ error: runError.message }, { status: 500 });
    }

    const run = runs?.[0];
    if (!run) {
      return NextResponse.json({ run: null, timelines: [] });
    }

    const { data: timelines, error: tlError } = await supabaseAdmin
      .from('simulation_timelines')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('run_id', run.id)
      .order('score_overall', { ascending: false });

    if (tlError) {
      return NextResponse.json({ error: tlError.message }, { status: 500 });
    }

    return NextResponse.json({ run, timelines: timelines ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


