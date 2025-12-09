/**
 * Identity XP Bonus System
 * ========================
 * 
 * When an archetype is active, XP gains in aligned categories get a 25% bonus.
 */

import { ArchetypeId, ARCHETYPES } from './types';

export type XPCategory = 'DXP' | 'PXP' | 'IXP' | 'AXP' | 'MXP';

/**
 * Calculate XP with identity bonus applied
 */
export function applyIdentityBonus(
  baseXP: number,
  category: XPCategory,
  activeArchetype: ArchetypeId | null
): {
  finalXP: number;
  bonusApplied: boolean;
  bonusAmount: number;
  multiplier: number;
  archetype: string | null;
} {
  if (!activeArchetype) {
    return {
      finalXP: baseXP,
      bonusApplied: false,
      bonusAmount: 0,
      multiplier: 1,
      archetype: null,
    };
  }

  const archetype = ARCHETYPES[activeArchetype];
  if (!archetype) {
    return {
      finalXP: baseXP,
      bonusApplied: false,
      bonusAmount: 0,
      multiplier: 1,
      archetype: null,
    };
  }

  // Check if this XP category matches the archetype's bonus category
  if (archetype.xpBonus.category === category) {
    const multiplier = archetype.xpBonus.multiplier;
    const finalXP = Math.round(baseXP * multiplier);
    const bonusAmount = finalXP - baseXP;

    return {
      finalXP,
      bonusApplied: true,
      bonusAmount,
      multiplier,
      archetype: archetype.name,
    };
  }

  return {
    finalXP: baseXP,
    bonusApplied: false,
    bonusAmount: 0,
    multiplier: 1,
    archetype: archetype.name,
  };
}

/**
 * Get which XP category an archetype boosts
 */
export function getArchetypeBoostCategory(archetypeId: ArchetypeId): XPCategory {
  return ARCHETYPES[archetypeId].xpBonus.category;
}

/**
 * Map activity types to XP categories
 */
export function activityToXPCategory(activity: string): XPCategory {
  const mapping: Record<string, XPCategory> = {
    // Deal activities → DXP
    'deal_created': 'DXP',
    'deal_advanced': 'DXP',
    'deal_won': 'DXP',
    'deal_updated': 'DXP',
    'task_completed': 'DXP',
    
    // People activities → PXP
    'follow_up': 'PXP',
    'contact_added': 'PXP',
    'meeting': 'PXP',
    'email_sent': 'PXP',
    'call_made': 'PXP',
    
    // Inner work → IXP
    'journal': 'IXP',
    'reflection': 'IXP',
    'meditation': 'IXP',
    'learning': 'IXP',
    'reading': 'IXP',
    
    // Automation/systems → AXP
    'automation': 'AXP',
    'system_built': 'AXP',
    'process_documented': 'AXP',
    'template_created': 'AXP',
    'capture': 'AXP',
    
    // Maintenance → MXP
    'habit': 'MXP',
    'routine': 'MXP',
    'inbox_zero': 'MXP',
    'review': 'MXP',
    'cleanup': 'MXP',
  };

  return mapping[activity] || 'DXP'; // Default to DXP
}

/**
 * Summary of archetype XP bonuses
 */
export const ARCHETYPE_XP_BONUSES: Record<ArchetypeId, { category: XPCategory; description: string }> = {
  stoic: { category: 'IXP', description: 'Inner Work XP +25%' },
  samurai: { category: 'DXP', description: 'Deal XP +25%' },
  builder: { category: 'AXP', description: 'Automation XP +25%' },
  father: { category: 'IXP', description: 'Inner Work XP +25%' },
  warrior: { category: 'DXP', description: 'Deal XP +25%' },
  strategist: { category: 'AXP', description: 'Automation XP +25%' },
  leader: { category: 'PXP', description: 'People XP +25%' },
  creator: { category: 'AXP', description: 'Automation XP +25%' },
  scholar: { category: 'IXP', description: 'Inner Work XP +25%' },
  monk: { category: 'MXP', description: 'Maintenance XP +25%' },
};
