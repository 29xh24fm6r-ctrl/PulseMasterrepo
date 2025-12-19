// What-If Replay - Get Run API
// app/api/what-if/run/[id]/route.ts

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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUserId = await resolveUserId(userId);
    const runId = params.id;

    const [runRes, outcomeRes, scenarioRes] = await Promise.all([
      supabaseAdmin
        .from('what_if_runs')
        .select('*')
        .eq('id', runId)
        .eq('user_id', dbUserId)
        .maybeSingle(),
      supabaseAdmin
        .from('what_if_outcomes')
        .select('*')
        .eq('run_id', runId)
        .eq('user_id', dbUserId)
        .maybeSingle(),
      supabaseAdmin
        .from('what_if_scenarios')
        .select('*')
        .eq('user_id', dbUserId)
        .maybeSingle(),
    ]);

    if (!runRes.data) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    // Get scenario if we have scenario_id
    let scenario = null;
    if (runRes.data.scenario_id) {
      const { data: scenarioData } = await supabaseAdmin
        .from('what_if_scenarios')
        .select('*')
        .eq('id', runRes.data.scenario_id)
        .eq('user_id', dbUserId)
        .maybeSingle();
      scenario = scenarioData;
    }

    return NextResponse.json({
      run: runRes.data,
      outcome: outcomeRes.data,
      scenario: scenario,
    });
  } catch (err) {
    console.error('[API] Get what-if run failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch run' },
      { status: 500 }
    );
  }
}


