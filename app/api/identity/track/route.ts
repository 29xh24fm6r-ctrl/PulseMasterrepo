import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { applyIdentityAction, createInitialIdentityState } from '@/lib/identity/engine';
import { IDENTITY_ACTIONS, IdentityState } from '@/lib/identity/types';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const IDENTITY_DB = process.env.NOTION_DATABASE_IDENTITY;

export async function POST(request: NextRequest) {
  try {
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

    // Log to Notion if configured
    if (IDENTITY_DB) {
      try {
        const action = IDENTITY_ACTIONS[actionId];
        await notion.pages.create({
          parent: { database_id: IDENTITY_DB.replace(/-/g, '') },
          properties: {
            Name: { title: [{ text: { content: action.name } }] },
            Date: { date: { start: new Date().toISOString() } },
            Action: { select: { name: actionId } },
            XP: { number: result.xpAwarded.amount },
            Category: { select: { name: result.xpAwarded.category } },
            ...(notes && { Notes: { rich_text: [{ text: { content: notes } }] } }),
          },
        });
      } catch (e) {
        console.error('Failed to log to Notion:', e);
      }
    }

    return NextResponse.json({
      ok: true,
      action: IDENTITY_ACTIONS[actionId],
      resonanceGained: result.resonanceGained,
      valuesReinforced: result.valuesReinforced,
      xpAwarded: result.xpAwarded,
      newState: result.newState,
    });

  } catch (error: unknown) {
    console.error('Identity track error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
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
