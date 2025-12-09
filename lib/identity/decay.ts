/**
 * Identity Decay System
 */
import { IdentityState, ArchetypeId, ValueId } from './types';

const DECAY_RATE = 0.02;
const VALUE_DRIFT_RATE = 2;
const NEUTRAL_VALUE = 50;

export function daysSinceLastAction(state: IdentityState): number {
  if (!state.lastActionDate) return 0;
  const lastAction = new Date(state.lastActionDate);
  const now = new Date();
  lastAction.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffTime = now.getTime() - lastAction.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

export function applyDecay(state: IdentityState): {
  newState: IdentityState;
  decayApplied: boolean;
  daysInactive: number;
  decayDetails: { archetypesDecayed: { id: string; oldValue: number; newValue: number }[]; valuesDrifted: { id: string; oldValue: number; newValue: number }[] };
} {
  const daysInactive = daysSinceLastAction(state);
  if (daysInactive <= 1) {
    return { newState: state, decayApplied: false, daysInactive, decayDetails: { archetypesDecayed: [], valuesDrifted: [] } };
  }
  const decayDays = daysInactive - 1;
  const archetypesDecayed: { id: string; oldValue: number; newValue: number }[] = [];
  const valuesDrifted: { id: string; oldValue: number; newValue: number }[] = [];
  const newResonance = { ...state.resonance };
  for (const [id, data] of Object.entries(newResonance)) {
    const oldValue = data.current;
    const newValue = Math.round(oldValue * Math.pow(1 - DECAY_RATE, decayDays));
    if (newValue !== oldValue) {
      newResonance[id as ArchetypeId] = { ...data, current: newValue, trend: 'falling' };
      archetypesDecayed.push({ id, oldValue, newValue });
    }
  }
  const newValues = { ...state.values };
  for (const [id, data] of Object.entries(newValues)) {
    const oldValue = data.score;
    let newValue = oldValue;
    if (oldValue > NEUTRAL_VALUE) newValue = Math.max(NEUTRAL_VALUE, oldValue - (VALUE_DRIFT_RATE * decayDays));
    else if (oldValue < NEUTRAL_VALUE) newValue = Math.min(NEUTRAL_VALUE, oldValue + (VALUE_DRIFT_RATE * decayDays));
    newValue = Math.round(newValue);
    if (newValue !== oldValue) {
      newValues[id as ValueId] = { ...data, score: newValue, trend: newValue < oldValue ? 'falling' : 'rising' };
      valuesDrifted.push({ id, oldValue, newValue });
    }
  }
  let activeArchetype = state.activeArchetype;
  let activatedAt = state.activatedAt;
  if (activeArchetype && newResonance[activeArchetype]?.current < 500) {
    activeArchetype = null;
    activatedAt = null;
  }
  const newState: IdentityState = { ...state, resonance: newResonance, values: newValues, activeArchetype, activatedAt, streakDays: 0, lastDecayDate: new Date().toISOString() };
  return { newState, decayApplied: archetypesDecayed.length > 0 || valuesDrifted.length > 0, daysInactive, decayDetails: { archetypesDecayed, valuesDrifted } };
}

export function shouldApplyDecay(state: IdentityState): boolean {
  if (!state.lastActionDate) return false;
  if (state.lastDecayDate) {
    const lastDecay = new Date(state.lastDecayDate);
    const today = new Date();
    if (lastDecay.toDateString() === today.toDateString()) return false;
  }
  return daysSinceLastAction(state) > 1;
}
