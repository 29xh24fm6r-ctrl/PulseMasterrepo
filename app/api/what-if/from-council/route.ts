// What-If Replay - From Council API
// app/api/what-if/from-council/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createWhatIfScenario, runWhatIfSimulation } from '@/lib/what_if_replay/v1/simulate';
import { supabaseAdmin } from '@/lib/supabase/admin';

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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, mode, horizon, alternateAssumption, baseAssumptionOverride } = body;

    if (!sessionId || !mode || !horizon || !alternateAssumption) {
      return NextResponse.json(
        { error: 'sessionId, mode, horizon, and alternateAssumption required' },
        { status: 400 }
      );
    }

    const dbUserId = await resolveUserId(userId);

    // Load council session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('council_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', dbUserId)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get consensus for default base assumption
    const { data: consensus } = await supabaseAdmin
      .from('council_consensus')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', dbUserId)
      .maybeSingle();

    const baseAssumption =
      baseAssumptionOverride ||
      `Continue with current plan: ${session.question}`;

    // Create scenario
    const scenarioId = await createWhatIfScenario(userId, {
      label: `What if: ${session.topic}`,
      description: session.question,
      originType: 'council_session',
      originId: sessionId,
      anchorTime: session.created_at,
      timescale: session.timescale,
      baseAssumption,
      alternateAssumption,
    });

    // Run simulation
    const result = await runWhatIfSimulation(userId, new Date(), {
      scenarioId,
      horizon,
      mode: mode as 'retro' | 'prospective',
    });

    return NextResponse.json({
      scenarioId,
      runId: result.runId,
      scenario: result.scenario,
      baseline: result.baseline,
      alternate: result.alternate,
      deltas: result.deltas,
      narrativeBaseline: result.narrativeBaseline,
      narrativeAlternate: result.narrativeAlternate,
      metricsBaseline: result.metricsBaseline,
      metricsAlternate: result.metricsAlternate,
      highlightDifferences: result.highlightDifferences,
    });
  } catch (err) {
    console.error('[API] What-If from council failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to run what-if simulation' },
      { status: 500 }
    );
  }
}


