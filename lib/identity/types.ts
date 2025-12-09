/**
 * Pulse OS Identity Engine - Types & Constants
 * =============================================
 * 
 * The Identity Engine tracks WHO you're becoming, not just WHAT you're doing.
 * It monitors resonance with core archetypes and values over time.
 */

// ============================================
// CORE ARCHETYPES
// ============================================

export type ArchetypeId = 
  | 'stoic'      // Emotional mastery, adversity as training
  | 'samurai'    // Decisive action, clean cuts, honor
  | 'builder'    // Systems thinking, creating leverage
  | 'father'     // Teaching, protecting, leading by example
  | 'warrior'    // Relentless pursuit, never backing down
  | 'strategist' // Long-term thinking, chess moves
  | 'leader'     // Influence, authority, command presence
  | 'creator'    // Building from nothing, innovation
  | 'scholar'    // Deep learning, wisdom accumulation
  | 'monk';      // Discipline, routine, spiritual growth

export interface Archetype {
  id: ArchetypeId;
  name: string;
  icon: string;
  color: string;
  description: string;
  coreTraits: string[];
  antiPatterns: string[];  // Behaviors that reduce resonance
  activationThreshold: number;  // Resonance needed to activate
  xpBonus: {
    category: 'DXP' | 'PXP' | 'IXP' | 'AXP' | 'MXP';
    multiplier: number;
  };
}

export const ARCHETYPES: Record<ArchetypeId, Archetype> = {
  stoic: {
    id: 'stoic',
    name: 'The Stoic',
    icon: '🏛️',
    color: '#6366f1',
    description: 'Master of emotions and adversity. Finds strength in what cannot be controlled.',
    coreTraits: ['Emotional regulation', 'Acceptance', 'Rational thinking', 'Resilience'],
    antiPatterns: ['Reactive anger', 'Complaining', 'Victim mentality'],
    activationThreshold: 500,
    xpBonus: { category: 'IXP', multiplier: 1.25 },
  },
  samurai: {
    id: 'samurai',
    name: 'The Samurai',
    icon: '⚔️',
    color: '#ef4444',
    description: 'Decisive action with honor. Makes clean cuts without hesitation.',
    coreTraits: ['Decisiveness', 'Honor', 'Precision', 'Commitment'],
    antiPatterns: ['Indecision', 'Half-measures', 'Breaking commitments'],
    activationThreshold: 500,
    xpBonus: { category: 'DXP', multiplier: 1.25 },
  },
  builder: {
    id: 'builder',
    name: 'The Builder',
    icon: '🏗️',
    color: '#f59e0b',
    description: 'Systems architect. Creates leverage through infrastructure.',
    coreTraits: ['Systems thinking', 'Patience', 'Long-term vision', 'Resourcefulness'],
    antiPatterns: ['Short-term thinking', 'Reinventing wheels', 'Manual repetition'],
    activationThreshold: 500,
    xpBonus: { category: 'AXP', multiplier: 1.25 },
  },
  father: {
    id: 'father',
    name: 'The Father',
    icon: '👨‍👧‍👦',
    color: '#10b981',
    description: 'Teacher, protector, leader by example. Shapes the next generation.',
    coreTraits: ['Patience', 'Presence', 'Teaching', 'Protection'],
    antiPatterns: ['Absence', 'Impatience with family', 'Broken promises to kids'],
    activationThreshold: 500,
    xpBonus: { category: 'IXP', multiplier: 1.25 },
  },
  warrior: {
    id: 'warrior',
    name: 'The Warrior',
    icon: '🛡️',
    color: '#dc2626',
    description: 'Relentless pursuit. Never backs down from worthy battles.',
    coreTraits: ['Persistence', 'Courage', 'Physical strength', 'Mental toughness'],
    antiPatterns: ['Giving up', 'Avoiding hard things', 'Physical neglect'],
    activationThreshold: 500,
    xpBonus: { category: 'DXP', multiplier: 1.25 },
  },
  strategist: {
    id: 'strategist',
    name: 'The Strategist',
    icon: '♟️',
    color: '#8b5cf6',
    description: 'Long-term thinker. Plays chess while others play checkers.',
    coreTraits: ['Planning', 'Pattern recognition', 'Patience', 'Calculated risk'],
    antiPatterns: ['Reactive decisions', 'No planning', 'Impulsive actions'],
    activationThreshold: 500,
    xpBonus: { category: 'AXP', multiplier: 1.25 },
  },
  leader: {
    id: 'leader',
    name: 'The Leader',
    icon: '🎖️',
    color: '#0891b2',
    description: 'Commands respect through presence and action. Others follow naturally.',
    coreTraits: ['Influence', 'Decisiveness', 'Communication', 'Accountability'],
    antiPatterns: ['Micromanaging', 'Avoiding responsibility', 'Poor communication'],
    activationThreshold: 500,
    xpBonus: { category: 'PXP', multiplier: 1.25 },
  },
  creator: {
    id: 'creator',
    name: 'The Creator',
    icon: '✨',
    color: '#ec4899',
    description: 'Builds something from nothing. Sees possibilities others miss.',
    coreTraits: ['Innovation', 'Vision', 'Experimentation', 'Artistic expression'],
    antiPatterns: ['Only consuming', 'Fear of shipping', 'Perfectionism paralysis'],
    activationThreshold: 500,
    xpBonus: { category: 'AXP', multiplier: 1.25 },
  },
  scholar: {
    id: 'scholar',
    name: 'The Scholar',
    icon: '📚',
    color: '#0ea5e9',
    description: 'Lifelong learner. Accumulates wisdom and shares knowledge.',
    coreTraits: ['Curiosity', 'Deep focus', 'Teaching', 'Synthesis'],
    antiPatterns: ['Intellectual stagnation', 'Shallow learning', 'Hoarding knowledge'],
    activationThreshold: 500,
    xpBonus: { category: 'IXP', multiplier: 1.25 },
  },
  monk: {
    id: 'monk',
    name: 'The Monk',
    icon: '🧘',
    color: '#a855f7',
    description: 'Master of discipline and routine. Finds peace in practice.',
    coreTraits: ['Discipline', 'Routine', 'Mindfulness', 'Simplicity'],
    antiPatterns: ['Chaos', 'Overindulgence', 'Distraction addiction'],
    activationThreshold: 500,
    xpBonus: { category: 'MXP', multiplier: 1.25 },
  },
};

// ============================================
// CORE VALUES
// ============================================

export type ValueId = 
  | 'integrity'
  | 'growth'
  | 'family'
  | 'excellence'
  | 'freedom'
  | 'impact'
  | 'wisdom'
  | 'courage'
  | 'discipline'
  | 'presence';

export interface CoreValue {
  id: ValueId;
  name: string;
  icon: string;
  description: string;
  alignedActions: string[];
}

export const CORE_VALUES: Record<ValueId, CoreValue> = {
  integrity: {
    id: 'integrity',
    name: 'Integrity',
    icon: '💎',
    description: 'Doing the right thing, especially when no one is watching',
    alignedActions: ['keeping_promise', 'honest_conversation', 'admitting_mistake'],
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    icon: '🌱',
    description: 'Constant improvement and learning',
    alignedActions: ['learning_skill', 'reading', 'seeking_feedback', 'leaving_comfort_zone'],
  },
  family: {
    id: 'family',
    name: 'Family',
    icon: '🏠',
    description: 'Prioritizing those who matter most',
    alignedActions: ['quality_time', 'being_present', 'family_activity', 'teaching_kids'],
  },
  excellence: {
    id: 'excellence',
    name: 'Excellence',
    icon: '🏆',
    description: 'Doing things right, with pride in craft',
    alignedActions: ['extra_mile', 'quality_work', 'attention_detail'],
  },
  freedom: {
    id: 'freedom',
    name: 'Freedom',
    icon: '🦅',
    description: 'Autonomy and independence in how you live',
    alignedActions: ['setting_boundaries', 'building_assets', 'saying_no'],
  },
  impact: {
    id: 'impact',
    name: 'Impact',
    icon: '💥',
    description: 'Making a difference that matters',
    alignedActions: ['helping_others', 'mentoring', 'creating_value'],
  },
  wisdom: {
    id: 'wisdom',
    name: 'Wisdom',
    icon: '🦉',
    description: 'Deep understanding and good judgment',
    alignedActions: ['reflection', 'learning_from_mistakes', 'seeking_truth'],
  },
  courage: {
    id: 'courage',
    name: 'Courage',
    icon: '🦁',
    description: 'Acting despite fear',
    alignedActions: ['difficult_conversation', 'taking_risk', 'standing_ground'],
  },
  discipline: {
    id: 'discipline',
    name: 'Discipline',
    icon: '⚡',
    description: 'Doing what needs to be done, regardless of feeling',
    alignedActions: ['morning_routine', 'habit_completion', 'delayed_gratification'],
  },
  presence: {
    id: 'presence',
    name: 'Presence',
    icon: '🎯',
    description: 'Being fully engaged in the moment',
    alignedActions: ['deep_work', 'active_listening', 'mindful_activity'],
  },
};

// ============================================
// IDENTITY STATE
// ============================================

export interface IdentityResonance {
  archetype: ArchetypeId;
  current: number;      // Current resonance (0-1000+)
  peak: number;         // Highest resonance ever achieved
  trend: 'rising' | 'stable' | 'falling';
  lastUpdated: string;  // ISO date
}

export interface ValueAlignment {
  value: ValueId;
  score: number;        // 0-100 alignment score
  recentActions: number; // Actions in last 7 days
  trend: 'rising' | 'stable' | 'falling';
}

export interface IdentityState {
  // Active identity (if any)
  activeArchetype: ArchetypeId | null;
  activatedAt: string | null;
  
  // Resonance with each archetype
  resonance: Record<ArchetypeId, IdentityResonance>;
  
  // Core values alignment
  values: Record<ValueId, ValueAlignment>;
  
  // North Star
  northStar: {
    vision: string;       // Long-term vision statement
    mission: string;      // Current mission/focus
    updatedAt: string;
  } | null;
  
  // Stats
  totalIdentityActions: number;
  streakDays: number;
  lastActionDate: string;
  lastDecayDate?: string;
  quizCompleted?: boolean;
  quizCompletedAt?: string;
}

// ============================================
// ACTION MAPPINGS
// ============================================

export interface IdentityAction {
  id: string;
  name: string;
  description: string;
  archetypes: { id: ArchetypeId; resonance: number }[];
  values: ValueId[];
  xpCategory: 'DXP' | 'PXP' | 'IXP' | 'AXP' | 'MXP';
  baseXP: number;
}

export const IDENTITY_ACTIONS: Record<string, IdentityAction> = {
  // Stoic actions
  stayed_calm_under_pressure: {
    id: 'stayed_calm_under_pressure',
    name: 'Stayed Calm Under Pressure',
    description: 'Maintained composure in a stressful situation',
    archetypes: [{ id: 'stoic', resonance: 25 }, { id: 'warrior', resonance: 10 }],
    values: ['courage', 'discipline'],
    xpCategory: 'IXP',
    baseXP: 30,
  },
  reframed_negative: {
    id: 'reframed_negative',
    name: 'Reframed Negative to Positive',
    description: 'Found the opportunity in a setback',
    archetypes: [{ id: 'stoic', resonance: 20 }, { id: 'strategist', resonance: 10 }],
    values: ['growth', 'wisdom'],
    xpCategory: 'IXP',
    baseXP: 25,
  },
  
  // Samurai actions
  made_clean_decision: {
    id: 'made_clean_decision',
    name: 'Made a Clean Decision',
    description: 'Decided decisively without overthinking',
    archetypes: [{ id: 'samurai', resonance: 25 }, { id: 'leader', resonance: 15 }],
    values: ['courage', 'excellence'],
    xpCategory: 'DXP',
    baseXP: 20,
  },
  kept_commitment: {
    id: 'kept_commitment',
    name: 'Honored a Commitment',
    description: 'Did what you said you would do',
    archetypes: [{ id: 'samurai', resonance: 20 }, { id: 'warrior', resonance: 10 }],
    values: ['integrity', 'discipline'],
    xpCategory: 'DXP',
    baseXP: 25,
  },
  
  // Builder actions
  built_system: {
    id: 'built_system',
    name: 'Built a System',
    description: 'Created automation or process that saves future time',
    archetypes: [{ id: 'builder', resonance: 30 }, { id: 'strategist', resonance: 15 }],
    values: ['excellence', 'freedom'],
    xpCategory: 'AXP',
    baseXP: 50,
  },
  documented_process: {
    id: 'documented_process',
    name: 'Documented a Process',
    description: 'Created documentation for future reference',
    archetypes: [{ id: 'builder', resonance: 15 }, { id: 'scholar', resonance: 10 }],
    values: ['excellence', 'impact'],
    xpCategory: 'AXP',
    baseXP: 20,
  },
  
  // Father actions
  quality_time_family: {
    id: 'quality_time_family',
    name: 'Quality Time with Family',
    description: 'Fully present time with loved ones',
    archetypes: [{ id: 'father', resonance: 30 }],
    values: ['family', 'presence'],
    xpCategory: 'IXP',
    baseXP: 25,
  },
  taught_something: {
    id: 'taught_something',
    name: 'Taught Something',
    description: 'Passed on knowledge or skill to someone',
    archetypes: [{ id: 'father', resonance: 20 }, { id: 'scholar', resonance: 15 }, { id: 'leader', resonance: 10 }],
    values: ['impact', 'wisdom'],
    xpCategory: 'IXP',
    baseXP: 30,
  },
  
  // Warrior actions
  pushed_through_hard: {
    id: 'pushed_through_hard',
    name: 'Pushed Through Something Hard',
    description: 'Completed something despite wanting to quit',
    archetypes: [{ id: 'warrior', resonance: 30 }, { id: 'monk', resonance: 10 }],
    values: ['courage', 'discipline'],
    xpCategory: 'DXP',
    baseXP: 35,
  },
  physical_training: {
    id: 'physical_training',
    name: 'Physical Training',
    description: 'Completed a workout or physical challenge',
    archetypes: [{ id: 'warrior', resonance: 20 }, { id: 'monk', resonance: 15 }],
    values: ['discipline', 'growth'],
    xpCategory: 'DXP',
    baseXP: 20,
  },
  
  // Strategist actions
  long_term_planning: {
    id: 'long_term_planning',
    name: 'Long-term Planning Session',
    description: 'Spent time planning beyond the immediate',
    archetypes: [{ id: 'strategist', resonance: 25 }, { id: 'builder', resonance: 10 }],
    values: ['wisdom', 'excellence'],
    xpCategory: 'AXP',
    baseXP: 30,
  },
  chose_hard_right: {
    id: 'chose_hard_right',
    name: 'Chose the Hard Right over Easy Wrong',
    description: 'Made the principled choice despite difficulty',
    archetypes: [{ id: 'strategist', resonance: 15 }, { id: 'stoic', resonance: 20 }, { id: 'samurai', resonance: 15 }],
    values: ['integrity', 'courage'],
    xpCategory: 'IXP',
    baseXP: 40,
  },
  
  // Leader actions  
  difficult_conversation: {
    id: 'difficult_conversation',
    name: 'Had a Difficult Conversation',
    description: 'Addressed something uncomfortable directly',
    archetypes: [{ id: 'leader', resonance: 25 }, { id: 'samurai', resonance: 15 }],
    values: ['courage', 'integrity'],
    xpCategory: 'PXP',
    baseXP: 35,
  },
  set_boundary: {
    id: 'set_boundary',
    name: 'Set a Boundary',
    description: 'Said no to protect time/energy',
    archetypes: [{ id: 'leader', resonance: 20 }, { id: 'warrior', resonance: 10 }],
    values: ['freedom', 'discipline'],
    xpCategory: 'PXP',
    baseXP: 25,
  },
  
  // Creator actions
  shipped_something: {
    id: 'shipped_something',
    name: 'Shipped Something',
    description: 'Published, launched, or released a creation',
    archetypes: [{ id: 'creator', resonance: 35 }, { id: 'builder', resonance: 15 }],
    values: ['excellence', 'courage'],
    xpCategory: 'AXP',
    baseXP: 50,
  },
  creative_session: {
    id: 'creative_session',
    name: 'Creative Session',
    description: 'Spent time in creative work',
    archetypes: [{ id: 'creator', resonance: 20 }],
    values: ['growth', 'presence'],
    xpCategory: 'AXP',
    baseXP: 20,
  },
  
  // Scholar actions
  deep_learning: {
    id: 'deep_learning',
    name: 'Deep Learning Session',
    description: 'Studied something in depth',
    archetypes: [{ id: 'scholar', resonance: 25 }, { id: 'monk', resonance: 10 }],
    values: ['growth', 'wisdom'],
    xpCategory: 'IXP',
    baseXP: 25,
  },
  reflection_session: {
    id: 'reflection_session',
    name: 'Reflection Session',
    description: 'Thoughtful reflection on experiences',
    archetypes: [{ id: 'scholar', resonance: 15 }, { id: 'stoic', resonance: 15 }],
    values: ['wisdom', 'growth'],
    xpCategory: 'IXP',
    baseXP: 20,
  },
  
  // Monk actions
  morning_routine: {
    id: 'morning_routine',
    name: 'Morning Routine Completed',
    description: 'Completed full morning routine',
    archetypes: [{ id: 'monk', resonance: 25 }, { id: 'warrior', resonance: 10 }],
    values: ['discipline', 'presence'],
    xpCategory: 'MXP',
    baseXP: 20,
  },
  meditation: {
    id: 'meditation',
    name: 'Meditation Practice',
    description: 'Completed meditation or mindfulness practice',
    archetypes: [{ id: 'monk', resonance: 30 }, { id: 'stoic', resonance: 15 }],
    values: ['presence', 'discipline'],
    xpCategory: 'IXP',
    baseXP: 15,
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getArchetypeById(id: ArchetypeId): Archetype {
  return ARCHETYPES[id];
}

export function getValueById(id: ValueId): CoreValue {
  return CORE_VALUES[id];
}

export function getActionById(id: string): IdentityAction | undefined {
  return IDENTITY_ACTIONS[id];
}

export function createInitialIdentityState(): IdentityState {
  const resonance: Record<ArchetypeId, IdentityResonance> = {} as Record<ArchetypeId, IdentityResonance>;
  (Object.keys(ARCHETYPES) as ArchetypeId[]).forEach((id) => {
    resonance[id] = {
      archetype: id,
      current: 0,
      peak: 0,
      trend: 'stable',
      lastUpdated: new Date().toISOString(),
    };
  });

  const values: Record<ValueId, ValueAlignment> = {} as Record<ValueId, ValueAlignment>;
  (Object.keys(CORE_VALUES) as ValueId[]).forEach((id) => {
    values[id] = {
      value: id,
      score: 50, // Start at neutral
      recentActions: 0,
      trend: 'stable',
    };
  });

  return {
    activeArchetype: null,
    activatedAt: null,
    resonance,
    values,
    northStar: null,
    totalIdentityActions: 0,
    streakDays: 0,
    lastActionDate: '',
  };
}
