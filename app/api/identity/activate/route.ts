import { NextRequest, NextResponse } from 'next/server';
import { 
  IdentityState, 
  ArchetypeId, 
  ARCHETYPES,
  createInitialIdentityState 
} from '@/lib/identity/types';
import { canActivateArchetype } from '@/lib/identity/engine';

export async function POST(request: NextRequest) {
  try {
    const { archetypeId, currentState, action } = await request.json();

    if (!archetypeId) {
      return NextResponse.json({ ok: false, error: 'archetypeId required' }, { status: 400 });
    }

    if (!ARCHETYPES[archetypeId as ArchetypeId]) {
      return NextResponse.json({ 
        ok: false, 
        error: `Unknown archetype: ${archetypeId}`,
        validArchetypes: Object.keys(ARCHETYPES),
      }, { status: 400 });
    }

    const state: IdentityState = currentState || createInitialIdentityState();
    const archetype = ARCHETYPES[archetypeId as ArchetypeId];

    // Handle deactivation
    if (action === 'deactivate') {
      if (state.activeArchetype !== archetypeId) {
        return NextResponse.json({ 
          ok: false, 
          error: `${archetype.name} is not currently active` 
        }, { status: 400 });
      }

      const newState: IdentityState = {
        ...state,
        activeArchetype: null,
        activatedAt: null,
      };

      return NextResponse.json({
        ok: true,
        action: 'deactivated',
        archetype: {
          id: archetypeId,
          name: archetype.name,
          icon: archetype.icon,
        },
        newState,
        message: `${archetype.name} has been deactivated`,
      });
    }

    // Handle activation
    if (!canActivateArchetype(state, archetypeId as ArchetypeId)) {
      const currentResonance = state.resonance[archetypeId as ArchetypeId]?.current || 0;
      const needed = archetype.activationThreshold - currentResonance;

      return NextResponse.json({ 
        ok: false, 
        error: `Cannot activate ${archetype.name} - need ${needed} more resonance`,
        currentResonance,
        threshold: archetype.activationThreshold,
        needed,
      }, { status: 400 });
    }

    // Already active?
    if (state.activeArchetype === archetypeId) {
      return NextResponse.json({ 
        ok: false, 
        error: `${archetype.name} is already active` 
      }, { status: 400 });
    }

    // Activate!
    const newState: IdentityState = {
      ...state,
      activeArchetype: archetypeId as ArchetypeId,
      activatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      ok: true,
      action: 'activated',
      archetype: {
        id: archetypeId,
        name: archetype.name,
        icon: archetype.icon,
        color: archetype.color,
        xpBonus: archetype.xpBonus,
      },
      newState,
      message: `${archetype.icon} ${archetype.name} activated! You now earn +25% ${archetype.xpBonus.category}`,
    });

  } catch (error: unknown) {
    console.error('Archetype activation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
