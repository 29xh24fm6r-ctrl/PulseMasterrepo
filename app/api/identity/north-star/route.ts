import { NextRequest, NextResponse } from 'next/server';
import { IdentityState, createInitialIdentityState } from '@/lib/identity/types';

export async function POST(request: NextRequest) {
  try {
    const { vision, mission, currentState } = await request.json();

    if (!vision && !mission) {
      return NextResponse.json({ 
        ok: false, 
        error: 'vision or mission required' 
      }, { status: 400 });
    }

    const state: IdentityState = currentState || createInitialIdentityState();

    // Update north star
    const newState: IdentityState = {
      ...state,
      northStar: {
        vision: vision || state.northStar?.vision || '',
        mission: mission || state.northStar?.mission || '',
        updatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json({
      ok: true,
      northStar: newState.northStar,
      newState,
      message: 'North Star updated',
    });

  } catch (error: unknown) {
    console.error('North Star update error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { currentState } = await request.json();
    
    const state: IdentityState = currentState || createInitialIdentityState();

    const newState: IdentityState = {
      ...state,
      northStar: null,
    };

    return NextResponse.json({
      ok: true,
      newState,
      message: 'North Star cleared',
    });

  } catch (error: unknown) {
    console.error('North Star delete error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
