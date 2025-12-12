// Mythic Intelligence - Deal Archetype Run API
// app/api/mythic/deal/run/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { classifyDealArchetype } from '@/lib/mythic/deal_classify';
import { applyDealArchetypeToCoaches } from '@/lib/mythic/integration';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { dealId } = body;

    if (!dealId) {
      return NextResponse.json({ error: 'dealId required' }, { status: 400 });
    }

    const run = await classifyDealArchetype({ userId, dealId });

    // Apply to coaches
    await applyDealArchetypeToCoaches(dealId, userId).catch((err) => {
      console.error('[Mythic] Coach integration failed', err);
    });

    return NextResponse.json({ run });
  } catch (err) {
    console.error('[API] Mythic deal run failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to run deal archetype classification' },
      { status: 500 }
    );
  }
}


