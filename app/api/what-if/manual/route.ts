// What-If Replay - Manual API
// app/api/what-if/manual/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createWhatIfScenario, runWhatIfSimulation } from '@/lib/what_if_replay/v1/simulate';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      label,
      description,
      baseAssumption,
      alternateAssumption,
      mode,
      horizon,
      anchorTime,
      timescale,
    } = body;

    if (!label || !baseAssumption || !alternateAssumption || !mode || !horizon) {
      return NextResponse.json(
        { error: 'label, baseAssumption, alternateAssumption, mode, and horizon required' },
        { status: 400 }
      );
    }

    // Create scenario
    const scenarioId = await createWhatIfScenario(userId, {
      label,
      description,
      originType: 'manual',
      originId: null,
      anchorTime: anchorTime ?? null,
      timescale: timescale ?? null,
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
    console.error('[API] What-If manual failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to run what-if simulation' },
      { status: 500 }
    );
  }
}


