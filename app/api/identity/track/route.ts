import { NextRequest, NextResponse } from 'next/server';
import { applyIdentityAction, createInitialIdentityState } from '@/lib/identity/engine';
import { IDENTITY_ACTIONS, IdentityState } from '@/lib/identity/types';
import { createJournalEntry, getJournalEntries } from '@/lib/data/journal'; // Use journal for logging
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { actionId, notes, currentState } = await request.json();

    if (!actionId) {
      return NextResponse.json({ ok: false, error: 'actionId required' }, { status: 400 });
    }

    if (!IDENTITY_ACTIONS[actionId]) {
      return NextResponse.json({
        ok: false,
        error: `Unknown action: ${actionId}`,
        validActions: Object.keys(IDENTITY_ACTIONS),
      }, { status: 400 });
    }

    // Use provided state or create initial
    const state: IdentityState = currentState || createInitialIdentityState();

    // Apply the action
    const result = applyIdentityAction(state, actionId, { notes });

    // Log to Supabase Journal
    try {
      const action = IDENTITY_ACTIONS[actionId];
      await createJournalEntry(userId, {
        title: `Identity Action: ${action.name}`,
        content: `Completed ${action.name}. ${notes ? `Notes: ${notes}` : ''}`,
        tags: ['Identity', actionId, result.xpAwarded.category],
        xp_awarded: result.xpAwarded.amount
      });
    } catch (e) {
      console.error('Failed to log identity action to journal:', e);
    }

    return NextResponse.json({
      ok: true,
      action: IDENTITY_ACTIONS[actionId],
      resonanceGained: result.resonanceGained,
      valuesReinforced: result.valuesReinforced,
      xpAwarded: result.xpAwarded,
      newState: result.newState,
    });

  } catch (error: any) {
    console.error('Identity track error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// GET available actions
export async function GET() {
  const actions = Object.entries(IDENTITY_ACTIONS).map(([id, action]) => ({
    id,
    name: action.name,
    description: action.description,
    archetypes: action.archetypes.map(a => a.id),
    values: action.values,
    xpCategory: action.xpCategory,
    baseXP: action.baseXP,
  }));

  return NextResponse.json({ ok: true, actions });
}
