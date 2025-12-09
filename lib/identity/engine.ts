/**
 * Pulse OS Identity Engine
 * ========================
 * 
 * Core engine for tracking identity resonance and value alignment.
 */

import {
  ArchetypeId,
  ValueId,
  IdentityState,
  ARCHETYPES,
  IDENTITY_ACTIONS,
  createInitialIdentityState,
} from './types';

// Re-export for convenience
export { createInitialIdentityState };

// ============================================
// RESONANCE CALCULATIONS
// ============================================

/**
 * Apply an identity action to the state
 */
export function applyIdentityAction(
  state: IdentityState,
  actionId: string,
  options: { multiplier?: number; notes?: string } = {}
): {
  newState: IdentityState;
  resonanceGained: { archetype: ArchetypeId; amount: number }[];
  valuesReinforced: ValueId[];
  xpAwarded: { category: string; amount: number };
} {
  const action = IDENTITY_ACTIONS[actionId];
  if (!action) {
    throw new Error(`Unknown identity action: ${actionId}`);
  }

  const multiplier = options.multiplier || 1;
  const newState: IdentityState = JSON.parse(JSON.stringify(state)); // Deep clone
  const resonanceGained: { archetype: ArchetypeId; amount: number }[] = [];
  const valuesReinforced: ValueId[] = [...action.values];

  // Apply resonance to archetypes
  action.archetypes.forEach(({ id, resonance }) => {
    const gain = Math.round(resonance * multiplier);
    const current = newState.resonance[id];
    
    const newResonance = current.current + gain;
    const newPeak = Math.max(current.peak, newResonance);
    
    newState.resonance[id] = {
      ...current,
      current: newResonance,
      peak: newPeak,
      trend: gain > 0 ? 'rising' : current.trend,
      lastUpdated: new Date().toISOString(),
    };
    
    resonanceGained.push({ archetype: id, amount: gain });
  });

  // Reinforce values
  action.values.forEach((valueId) => {
    const current = newState.values[valueId];
    const newScore = Math.min(100, current.score + 2); // +2 per aligned action
    
    newState.values[valueId] = {
      ...current,
      score: newScore,
      recentActions: current.recentActions + 1,
      trend: 'rising',
    };
  });

  // Calculate XP (with active archetype bonus)
  let xpAmount = action.baseXP;
  if (newState.activeArchetype) {
    const activeArch = ARCHETYPES[newState.activeArchetype];
    if (action.xpCategory === activeArch.xpBonus.category) {
      xpAmount = Math.round(xpAmount * activeArch.xpBonus.multiplier);
    }
  }

  // Update stats
  const today = new Date().toISOString().split('T')[0];
  const wasActiveToday = newState.lastActionDate === today;
  
  newState.totalIdentityActions += 1;
  newState.lastActionDate = today;
  
  if (!wasActiveToday) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const wasActiveYesterday = newState.lastActionDate === yesterday.toISOString().split('T')[0];
    newState.streakDays = wasActiveYesterday ? newState.streakDays + 1 : 1;
  }

  return {
    newState,
    resonanceGained,
    valuesReinforced,
    xpAwarded: { category: action.xpCategory, amount: xpAmount },
  };
}

/**
 * Check if an archetype can be activated
 */
export function canActivateArchetype(state: IdentityState, archetypeId: ArchetypeId): boolean {
  const archetype = ARCHETYPES[archetypeId];
  const resonance = state.resonance[archetypeId];
  return resonance.current >= archetype.activationThreshold;
}

/**
 * Activate an archetype
 */
export function activateArchetype(
  state: IdentityState,
  archetypeId: ArchetypeId
): IdentityState {
  if (!canActivateArchetype(state, archetypeId)) {
    throw new Error(`Cannot activate ${archetypeId} - insufficient resonance`);
  }

  return {
    ...state,
    activeArchetype: archetypeId,
    activatedAt: new Date().toISOString(),
  };
}

/**
 * Deactivate current archetype
 */
export function deactivateArchetype(state: IdentityState): IdentityState {
  return {
    ...state,
    activeArchetype: null,
    activatedAt: null,
  };
}

/**
 * Get top archetypes by resonance
 */
export function getTopArchetypes(
  state: IdentityState,
  count: number = 3
): { archetype: ArchetypeId; resonance: number; canActivate: boolean }[] {
  return Object.values(state.resonance)
    .sort((a, b) => b.current - a.current)
    .slice(0, count)
    .map((r) => ({
      archetype: r.archetype,
      resonance: r.current,
      canActivate: canActivateArchetype(state, r.archetype),
    }));
}

/**
 * Get top values by alignment
 */
export function getTopValues(
  state: IdentityState,
  count: number = 3
): { value: ValueId; score: number }[] {
  return Object.values(state.values)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((v) => ({
      value: v.value,
      score: v.score,
    }));
}

/**
 * Decay resonance over time (call daily)
 */
export function applyResonanceDecay(state: IdentityState): IdentityState {
  const newState: IdentityState = JSON.parse(JSON.stringify(state));
  const today = new Date();
  
  (Object.keys(newState.resonance) as ArchetypeId[]).forEach((archId) => {
    const current = newState.resonance[archId];
    const lastUpdated = new Date(current.lastUpdated);
    const daysSinceUpdate = Math.floor(
      (today.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceUpdate > 0) {
      // Decay 2% per day of inactivity, minimum 0
      const decayRate = 0.02 * daysSinceUpdate;
      const decayedResonance = Math.max(0, Math.round(current.current * (1 - decayRate)));
      
      newState.resonance[archId] = {
        ...current,
        current: decayedResonance,
        trend: decayedResonance < current.current ? 'falling' : 'stable',
      };
    }
  });

  // Decay values too (slower rate)
  (Object.keys(newState.values) as ValueId[]).forEach((valId) => {
    const current = newState.values[valId];
    
    // Move toward 50 (neutral) by 1 point per day of no activity
    if (current.recentActions === 0) {
      const newScore = current.score > 50 
        ? current.score - 1 
        : current.score < 50 
        ? current.score + 1 
        : current.score;
      
      newState.values[valId] = {
        ...current,
        score: newScore,
        trend: newScore !== current.score ? 'falling' : 'stable',
      };
    }
  });

  return newState;
}

/**
 * Calculate overall identity strength (0-100)
 */
export function calculateIdentityStrength(state: IdentityState): number {
  // Average of top 3 archetype resonances (normalized to 100)
  const topResonances = getTopArchetypes(state, 3);
  const avgResonance = topResonances.reduce((sum, t) => sum + t.resonance, 0) / 3;
  const normalizedResonance = Math.min(100, avgResonance / 10); // 1000 resonance = 100%

  // Average of top 3 value alignments
  const topValues = getTopValues(state, 3);
  const avgValues = topValues.reduce((sum, v) => sum + v.score, 0) / 3;

  // Weighted average
  return Math.round((normalizedResonance * 0.6) + (avgValues * 0.4));
}

/**
 * Get suggested actions based on current state
 */
export function getSuggestedActions(state: IdentityState): string[] {
  const suggestions: string[] = [];
  
  // If active archetype, suggest aligned actions
  if (state.activeArchetype) {
    const activeActions = Object.entries(IDENTITY_ACTIONS)
      .filter(([_, action]) => 
        action.archetypes.some((a) => a.id === state.activeArchetype)
      )
      .slice(0, 3)
      .map(([id]) => id);
    suggestions.push(...activeActions);
  }
  
  // Suggest actions for weakest values
  const weakValues = Object.values(state.values)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);
  
  weakValues.forEach((v) => {
    const alignedAction = Object.entries(IDENTITY_ACTIONS)
      .find(([_, action]) => action.values.includes(v.value));
    if (alignedAction) {
      suggestions.push(alignedAction[0]);
    }
  });

  return Array.from(new Set(suggestions)).slice(0, 5);
}
