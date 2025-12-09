/**
 * Identity Insights Generator
 * ===========================
 * 
 * Generates personalized identity insights for morning brief.
 */

import {
  ArchetypeId,
  ARCHETYPES,
  CORE_VALUES,
  ValueId,
  IdentityState,
} from './types';

export interface IdentityInsight {
  type: 'archetype_progress' | 'archetype_ready' | 'value_warning' | 'streak' | 'suggestion';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  icon: string;
  actionable?: {
    label: string;
    href: string;
  };
}

/**
 * Generate identity insights for morning brief
 */
export function generateIdentityInsights(state: IdentityState): IdentityInsight[] {
  const insights: IdentityInsight[] = [];

  if (!state) return insights;

  // 1. Check for archetypes close to activation (400-499 resonance)
  const closeToActivation = Object.entries(state.resonance)
    .filter(([_, data]) => data.current >= 400 && data.current < 500)
    .sort((a, b) => b[1].current - a[1].current);

  closeToActivation.forEach(([id, data]) => {
    const archetype = ARCHETYPES[id as ArchetypeId];
    const remaining = 500 - data.current;
    const actionsNeeded = Math.ceil(remaining / 25); // ~25 resonance per action

    insights.push({
      type: 'archetype_progress',
      priority: 'high',
      title: `${archetype.icon} ${archetype.name} Almost Ready`,
      message: `You're ${remaining} resonance away from activating ${archetype.name}. About ${actionsNeeded} aligned actions to go!`,
      icon: archetype.icon,
      actionable: {
        label: 'View Dashboard',
        href: '/identity/dashboard',
      },
    });
  });

  // 2. Check for archetypes ready to activate (≥500 but not active)
  const readyToActivate = Object.entries(state.resonance)
    .filter(([id, data]) => data.current >= 500 && state.activeArchetype !== id)
    .sort((a, b) => b[1].current - a[1].current);

  if (readyToActivate.length > 0) {
    const [id, data] = readyToActivate[0];
    const archetype = ARCHETYPES[id as ArchetypeId];

    insights.push({
      type: 'archetype_ready',
      priority: 'high',
      title: `${archetype.icon} ${archetype.name} Ready to Activate!`,
      message: `You've reached ${data.current} resonance with ${archetype.name}. Activate it to get +25% ${archetype.xpBonus.category} XP!`,
      icon: archetype.icon,
      actionable: {
        label: 'Activate Now',
        href: '/identity/dashboard',
      },
    });
  }

  // 3. Check for declining values (below 40)
  const lowValues = Object.entries(state.values)
    .filter(([_, data]) => data.score < 40)
    .sort((a, b) => a[1].score - b[1].score);

  lowValues.slice(0, 2).forEach(([id, data]) => {
    const value = CORE_VALUES[id as ValueId];

    insights.push({
      type: 'value_warning',
      priority: 'medium',
      title: `${value.icon} ${value.name} Needs Attention`,
      message: `Your ${value.name} alignment is at ${data.score}%. Consider actions that reinforce this value.`,
      icon: value.icon,
      actionable: {
        label: 'Track Action',
        href: '/identity/dashboard',
      },
    });
  });

  // 4. Celebrate streaks
  if (state.streakDays >= 7) {
    insights.push({
      type: 'streak',
      priority: 'low',
      title: `🔥 ${state.streakDays} Day Identity Streak!`,
      message: `You've been tracking identity actions for ${state.streakDays} days straight. Keep the momentum going!`,
      icon: '🔥',
    });
  } else if (state.streakDays >= 3) {
    insights.push({
      type: 'streak',
      priority: 'low',
      title: `⚡ ${state.streakDays} Day Streak`,
      message: `${7 - state.streakDays} more days to hit a week-long identity streak!`,
      icon: '⚡',
    });
  }

  // 5. Active archetype reminder
  if (state.activeArchetype) {
    const archetype = ARCHETYPES[state.activeArchetype];
    const resonance = state.resonance[state.activeArchetype];

    insights.push({
      type: 'suggestion',
      priority: 'low',
      title: `${archetype.icon} ${archetype.name} Active`,
      message: `You're earning +25% ${archetype.xpBonus.category} XP. Current resonance: ${resonance.current}. Keep it above 500 to stay active!`,
      icon: archetype.icon,
    });
  }

  // 6. Suggest an action if no recent activity
  if (!state.lastActionDate || daysSince(state.lastActionDate) >= 1) {
    const topArchetype = Object.entries(state.resonance)
      .sort((a, b) => b[1].current - a[1].current)[0];
    
    if (topArchetype) {
      const archetype = ARCHETYPES[topArchetype[0] as ArchetypeId];
      
      insights.push({
        type: 'suggestion',
        priority: 'medium',
        title: `${archetype.icon} Suggested Focus: ${archetype.name}`,
        message: `Your strongest archetype. Track an aligned action today to maintain momentum.`,
        icon: archetype.icon,
        actionable: {
          label: 'Track Action',
          href: '/identity/dashboard',
        },
      });
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return insights.slice(0, 3); // Return top 3 insights
}

/**
 * Generate a summary sentence for morning brief
 */
export function generateIdentitySummary(state: IdentityState): string {
  if (!state) return "Start tracking your identity to see insights here.";

  const parts: string[] = [];

  // Active archetype
  if (state.activeArchetype) {
    const arch = ARCHETYPES[state.activeArchetype];
    parts.push(`${arch.icon} ${arch.name} is active (+25% ${arch.xpBonus.category})`);
  }

  // Top resonance
  const topArch = Object.entries(state.resonance)
    .sort((a, b) => b[1].current - a[1].current)[0];
  
  if (topArch && !state.activeArchetype) {
    const arch = ARCHETYPES[topArch[0] as ArchetypeId];
    const progress = Math.round((topArch[1].current / 500) * 100);
    parts.push(`${arch.icon} ${arch.name} at ${progress}% to activation`);
  }

  // Streak
  if (state.streakDays > 0) {
    parts.push(`${state.streakDays} day streak`);
  }

  // Total actions
  if (state.totalIdentityActions > 0) {
    parts.push(`${state.totalIdentityActions} total actions`);
  }

  if (parts.length === 0) {
    return "Visit your Identity Dashboard to start tracking who you're becoming.";
  }

  return parts.join(" • ");
}

/**
 * Calculate days since a date string
 */
function daysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}
