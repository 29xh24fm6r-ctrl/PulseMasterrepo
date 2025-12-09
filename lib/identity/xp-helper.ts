/**
 * XP Award Helper with Identity Bonus
 * ====================================
 * 
 * Server-side helper for awarding XP with identity archetype bonuses.
 * Use this in API routes that award XP.
 */

import { ArchetypeId, ARCHETYPES } from './types';

export type XPCategory = 'DXP' | 'PXP' | 'IXP' | 'AXP' | 'MXP';

export interface XPAwardResult {
  baseXP: number;
  finalXP: number;
  category: XPCategory;
  activity: string;
  bonusApplied: boolean;
  bonusAmount: number;
  bonusMultiplier: number;
  archetypeName: string | null;
  wasCrit: boolean;
  critMultiplier: number;
}

/**
 * Calculate XP award with all bonuses applied
 */
export function calculateXPAward(
  baseXP: number,
  category: XPCategory,
  activity: string,
  options: {
    activeArchetype?: ArchetypeId | null;
    critChance?: number; // 0-1, default 0.05 (5%)
    critMultiplier?: number; // default 2
  } = {}
): XPAwardResult {
  const {
    activeArchetype = null,
    critChance = 0.05,
    critMultiplier = 2,
  } = options;

  let finalXP = baseXP;
  let bonusApplied = false;
  let bonusAmount = 0;
  let bonusMultiplier = 1;
  let archetypeName: string | null = null;

  // Apply identity archetype bonus
  if (activeArchetype && ARCHETYPES[activeArchetype]) {
    const archetype = ARCHETYPES[activeArchetype];
    archetypeName = archetype.name;

    if (archetype.xpBonus.category === category) {
      bonusMultiplier = archetype.xpBonus.multiplier;
      finalXP = Math.round(baseXP * bonusMultiplier);
      bonusAmount = finalXP - baseXP;
      bonusApplied = true;
    }
  }

  // Check for crit
  const wasCrit = Math.random() < critChance;
  if (wasCrit) {
    finalXP = Math.round(finalXP * critMultiplier);
  }

  return {
    baseXP,
    finalXP,
    category,
    activity,
    bonusApplied,
    bonusAmount,
    bonusMultiplier,
    archetypeName,
    wasCrit,
    critMultiplier: wasCrit ? critMultiplier : 1,
  };
}

/**
 * Map common activities to XP categories
 */
export const ACTIVITY_CATEGORIES: Record<string, XPCategory> = {
  // Deal activities → DXP
  task_completed: 'DXP',
  deal_created: 'DXP',
  deal_advanced: 'DXP',
  deal_won: 'DXP',
  
  // People activities → PXP
  follow_up_sent: 'PXP',
  contact_added: 'PXP',
  meeting_completed: 'PXP',
  
  // Inner work → IXP
  journal_entry: 'IXP',
  reflection: 'IXP',
  identity_action: 'IXP',
  
  // Automation → AXP
  capture_saved: 'AXP',
  system_created: 'AXP',
  
  // Maintenance → MXP
  habit_completed: 'MXP',
  routine_done: 'MXP',
};

/**
 * Get XP category for an activity
 */
export function getActivityCategory(activity: string): XPCategory {
  return ACTIVITY_CATEGORIES[activity] || 'DXP';
}

/**
 * Standard XP values for common activities
 */
export const STANDARD_XP: Record<string, number> = {
  // Tasks
  task_low: 10,
  task_medium: 20,
  task_high: 35,
  task_urgent: 50,
  
  // Deals
  deal_created: 25,
  deal_advanced: 30,
  deal_won: 100,
  
  // Journal
  journal_entry: 25,
  
  // Habits
  habit_completed: 15,
  
  // Captures
  capture_saved: 10,
  
  // Follow-ups
  follow_up_sent: 15,
};
