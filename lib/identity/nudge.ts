/**
 * Identity Nudge Generator
 * ========================
 * 
 * Generates proactive nudges based on identity state.
 */

import { IdentityState, ARCHETYPES, ArchetypeId } from './types';

export interface IdentityNudge {
  type: 'no_action_today' | 'streak_at_risk' | 'archetype_ready' | 'decay_warning' | 'archetype_close';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  icon: string;
  action?: {
    label: string;
    href: string;
  };
}

/**
 * Check if user has tracked an identity action today
 */
function hasTrackedToday(state: IdentityState): boolean {
  if (!state.lastActionDate) return false;
  
  const lastAction = new Date(state.lastActionDate);
  const today = new Date();
  
  return lastAction.toDateString() === today.toDateString();
}

/**
 * Get days since last action
 */
function daysSinceAction(state: IdentityState): number {
  if (!state.lastActionDate) return 999;
  
  const lastAction = new Date(state.lastActionDate);
  const now = new Date();
  lastAction.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  
  return Math.floor((now.getTime() - lastAction.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Generate identity nudges based on current state
 */
export function generateIdentityNudges(state: IdentityState | null): IdentityNudge[] {
  const nudges: IdentityNudge[] = [];

  // No state = encourage starting
  if (!state || state.totalIdentityActions === 0) {
    nudges.push({
      type: 'no_action_today',
      priority: 'low',
      title: '🔮 Start Your Identity Journey',
      message: 'Track your first identity action to begin building who you want to become.',
      icon: '🔮',
      action: {
        label: 'Get Started',
        href: '/identity/dashboard',
      },
    });
    return nudges;
  }

  const trackedToday = hasTrackedToday(state);
  const daysSince = daysSinceAction(state);

  // No action today warning
  if (!trackedToday && daysSince >= 1) {
    if (state.streakDays > 0) {
      // Streak at risk
      nudges.push({
        type: 'streak_at_risk',
        priority: 'high',
        title: `🔥 ${state.streakDays} Day Streak at Risk!`,
        message: 'Track an identity action today to keep your streak alive.',
        icon: '🔥',
        action: {
          label: 'Track Action',
          href: '/identity/dashboard',
        },
      });
    } else {
      // Just a reminder
      nudges.push({
        type: 'no_action_today',
        priority: 'medium',
        title: '🎯 No Identity Action Today',
        message: 'Track an action to maintain your resonance and values.',
        icon: '🎯',
        action: {
          label: 'Track Action',
          href: '/identity/dashboard',
        },
      });
    }
  }

  // Decay warning (2+ days inactive)
  if (daysSince >= 2) {
    nudges.push({
      type: 'decay_warning',
      priority: 'high',
      title: '⚠️ Resonance Decaying',
      message: `${daysSince} days without tracking. Your archetype resonance is dropping!`,
      icon: '⚠️',
      action: {
        label: 'Stop the Decay',
        href: '/identity/dashboard',
      },
    });
  }

  // Check for archetypes ready to activate
  const readyArchetypes = Object.entries(state.resonance)
    .filter(([id, data]) => data.current >= 500 && state.activeArchetype !== id);
  
  if (readyArchetypes.length > 0 && !state.activeArchetype) {
    const [id] = readyArchetypes[0];
    const archetype = ARCHETYPES[id as ArchetypeId];
    
    nudges.push({
      type: 'archetype_ready',
      priority: 'high',
      title: `${archetype.icon} ${archetype.name} Ready!`,
      message: `Activate for +25% ${archetype.xpBonus.category} XP bonus.`,
      icon: archetype.icon,
      action: {
        label: 'Activate Now',
        href: '/identity/dashboard',
      },
    });
  }

  // Check for archetypes close to activation (400-499)
  if (!state.activeArchetype) {
    const closeArchetypes = Object.entries(state.resonance)
      .filter(([_, data]) => data.current >= 400 && data.current < 500)
      .sort((a, b) => b[1].current - a[1].current);
    
    if (closeArchetypes.length > 0 && nudges.length < 2) {
      const [id, data] = closeArchetypes[0];
      const archetype = ARCHETYPES[id as ArchetypeId];
      const remaining = 500 - data.current;
      
      nudges.push({
        type: 'archetype_close',
        priority: 'medium',
        title: `${archetype.icon} Almost There!`,
        message: `${remaining} more resonance to activate ${archetype.name}.`,
        icon: archetype.icon,
        action: {
          label: 'Keep Going',
          href: '/identity/dashboard',
        },
      });
    }
  }

  // Sort by priority and limit
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  nudges.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return nudges.slice(0, 2); // Max 2 nudges
}

/**
 * Get a single priority nudge (for notifications)
 */
export function getTopIdentityNudge(state: IdentityState | null): IdentityNudge | null {
  const nudges = generateIdentityNudges(state);
  return nudges.length > 0 ? nudges[0] : null;
}
