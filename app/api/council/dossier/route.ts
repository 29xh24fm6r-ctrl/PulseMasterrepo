// Executive Council - Dossier API
// app/api/council/dossier/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createCouncilDecisionDossier, getCouncilDossiersForUser } from '@/lib/executive_council/v1/dossier';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, decisionLabel, userChoice, userNotes } = body;

    if (!sessionId || !decisionLabel || !userChoice) {
      return NextResponse.json(
        { error: 'sessionId, decisionLabel, and userChoice required' },
        { status: 400 }
      );
    }

    const dossierId = await createCouncilDecisionDossier(userId, {
      sessionId,
      decisionLabel,
      userChoice,
      userNotes,
    });

    return NextResponse.json({ dossierId, success: true });
  } catch (err) {
    console.error('[API] Create council dossier failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create dossier' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const dossiers = await getCouncilDossiersForUser(userId, limit);

    return NextResponse.json({ dossiers });
  } catch (err) {
    console.error('[API] Get council dossiers failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch dossiers' },
      { status: 500 }
    );
  }
}


