// Pulse OS - XP Ascension Engine
// lib/xp/engine.ts

import {
  XPCategory,
  XP_CATEGORIES,
  IdentityType,
  IDENTITIES,
  ACTIVITY_XP_MAP,
  XPReward,
  CritWindow,
  getXPForLevel,
  getLevelFromXP,
  getLevelProgress,
  calculateAscensionLevel,
  SKILL_TREES,
  Skill,
} from './types';

// ============================================
// XP STATE
// ============================================

export interface XPState {
  // Raw XP totals
  totals: Record<XPCategory, number>;
  
  // Derived levels
  levels: Record<XPCategory, number>;
  
  // Ascension (combined) level
  ascensionLevel: number;
  
  // Active identity
  activeIdentity: IdentityType | null;
  
  // Identity resonance scores (how much each identity has been expressed)
  identityResonance: Record<IdentityType, number>;
  
  // Crit window state
  critWindow: CritWindow;
  
  // Unlocked skills
  unlockedSkills: string[];
  
  // Today's XP gains
  todayXP: Record<XPCategory, number>;
  
  // Streak data
  currentStreak: number;
  longestStreak: number;
  
  // Last updated
  lastUpdated: string;
}

export function createInitialXPState(): XPState {
  return {
    totals: { DXP: 0, PXP: 0, IXP: 0, AXP: 0, MXP: 0 },
    levels: { DXP: 1, PXP: 1, IXP: 1, AXP: 1, MXP: 1 },
    ascensionLevel: 1,
    activeIdentity: null,
    identityResonance: {
      Stoic: 0, Samurai: 0, Builder: 0, Father: 0,
      Warrior: 0, Strategist: 0, Leader: 0, Creator: 0,
    },
    critWindow: { active: false, multiplier: 1, reason: '', expiresAt: null },
    unlockedSkills: [],
    todayXP: { DXP: 0, PXP: 0, IXP: 0, AXP: 0, MXP: 0 },
    currentStreak: 0,
    longestStreak: 0,
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================
// XP CALCULATION
// ============================================

export interface XPGain {
  activity: string;
  baseXP: number;
  category: XPCategory;
  multipliers: {
    identity: number;
    crit: number;
    streak: number;
    skill: number;
  };
  finalXP: number;
  identitiesRewarded: IdentityType[];
  wasCrit: boolean;
  levelUp: boolean;
  newLevel?: number;
  skillsUnlocked: string[];
}

export function calculateXPGain(
  activity: string,
  state: XPState,
  options?: {
    forceCrit?: boolean;
    customMultiplier?: number;
    streakBonus?: number;
  }
): XPGain | null {
  const reward = ACTIVITY_XP_MAP[activity];
  if (!reward) {
    console.warn(`Unknown activity: ${activity}`);
    return null;
  }

  const { baseXP, category, identities, critEligible } = reward;

  // Calculate multipliers
  let identityMultiplier = 1;
  if (state.activeIdentity) {
    const identity = IDENTITIES[state.activeIdentity];
    const bonus = identity.bonuses.find(b => b.category === category);
    if (bonus) {
      identityMultiplier = bonus.multiplier;
    }
  }

  // Crit multiplier
  let critMultiplier = 1;
  let wasCrit = false;
  if ((critEligible && state.critWindow.active) || options?.forceCrit) {
    critMultiplier = state.critWindow.multiplier || 2;
    wasCrit = true;
  }

  // Streak multiplier (MXP bonus)
  let streakMultiplier = 1;
  if (category === 'MXP' || options?.streakBonus) {
    const streak = options?.streakBonus || state.currentStreak;
    if (streak >= 30) streakMultiplier = 1.5;
    else if (streak >= 14) streakMultiplier = 1.3;
    else if (streak >= 7) streakMultiplier = 1.2;
    else if (streak >= 3) streakMultiplier = 1.1;
  }

  // Skill multiplier (from unlocked skills)
  let skillMultiplier = 1;
  if (state.unlockedSkills.includes('xp_multiplier')) {
    skillMultiplier = 1.1;
  }

  // Custom multiplier
  const customMultiplier = options?.customMultiplier || 1;

  // Calculate final XP
  const finalXP = Math.round(
    baseXP * 
    identityMultiplier * 
    critMultiplier * 
    streakMultiplier * 
    skillMultiplier *
    customMultiplier
  );

  // Check for level up
  const currentLevel = state.levels[category];
  const newTotal = state.totals[category] + finalXP;
  const newLevel = getLevelFromXP(newTotal);
  const levelUp = newLevel > currentLevel;

  // Check for skill unlocks
  const skillsUnlocked: string[] = [];
  if (levelUp) {
    const categorySkills = SKILL_TREES[category];
    for (const skill of categorySkills) {
      if (skill.levelRequired === newLevel && !state.unlockedSkills.includes(skill.id)) {
        skillsUnlocked.push(skill.id);
      }
    }
  }

  return {
    activity,
    baseXP,
    category,
    multipliers: {
      identity: identityMultiplier,
      crit: critMultiplier,
      streak: streakMultiplier,
      skill: skillMultiplier,
    },
    finalXP,
    identitiesRewarded: identities,
    wasCrit,
    levelUp,
    newLevel: levelUp ? newLevel : undefined,
    skillsUnlocked,
  };
}

// ============================================
// APPLY XP GAIN
// ============================================

export function applyXPGain(state: XPState, gain: XPGain): XPState {
  const newState = { ...state };
  
  // Update totals
  newState.totals = { ...state.totals };
  newState.totals[gain.category] += gain.finalXP;
  
  // Update today's XP
  newState.todayXP = { ...state.todayXP };
  newState.todayXP[gain.category] += gain.finalXP;
  
  // Update levels
  newState.levels = { ...state.levels };
  newState.levels[gain.category] = getLevelFromXP(newState.totals[gain.category]);
  
  // Update Ascension Level
  newState.ascensionLevel = calculateAscensionLevel(newState.levels);
  
  // Update identity resonance
  newState.identityResonance = { ...state.identityResonance };
  for (const identity of gain.identitiesRewarded) {
    newState.identityResonance[identity] = (newState.identityResonance[identity] || 0) + gain.finalXP;
  }
  
  // Check for identity activation (threshold = 500 resonance)
  const IDENTITY_THRESHOLD = 500;
  let highestResonance = 0;
  let newActiveIdentity: IdentityType | null = null;
  
  for (const [identity, resonance] of Object.entries(newState.identityResonance)) {
    if (resonance >= IDENTITY_THRESHOLD && resonance > highestResonance) {
      highestResonance = resonance;
      newActiveIdentity = identity as IdentityType;
    }
  }
  
  if (newActiveIdentity && newActiveIdentity !== state.activeIdentity) {
    newState.activeIdentity = newActiveIdentity;
  }
  
  // Add unlocked skills
  if (gain.skillsUnlocked.length > 0) {
    newState.unlockedSkills = [...state.unlockedSkills, ...gain.skillsUnlocked];
  }
  
  // Clear crit window if used
  if (gain.wasCrit) {
    newState.critWindow = { active: false, multiplier: 1, reason: '', expiresAt: null };
  }
  
  newState.lastUpdated = new Date().toISOString();
  
  return newState;
}

// ============================================
// CRIT WINDOW
// ============================================

export function openCritWindow(
  state: XPState, 
  reason: string, 
  multiplier: number = 2,
  durationMinutes: number = 30
): XPState {
  return {
    ...state,
    critWindow: {
      active: true,
      multiplier,
      reason,
      expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000),
    },
  };
}

export function checkCritWindowExpiry(state: XPState): XPState {
  if (!state.critWindow.active || !state.critWindow.expiresAt) {
    return state;
  }
  
  if (new Date() > new Date(state.critWindow.expiresAt)) {
    return {
      ...state,
      critWindow: { active: false, multiplier: 1, reason: '', expiresAt: null },
    };
  }
  
  return state;
}

// ============================================
// STREAK MANAGEMENT
// ============================================

export function updateStreak(state: XPState, completed: boolean): XPState {
  if (completed) {
    const newStreak = state.currentStreak + 1;
    return {
      ...state,
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, state.longestStreak),
    };
  } else {
    return {
      ...state,
      currentStreak: 0,
    };
  }
}

// ============================================
// IDENTITY MANAGEMENT
// ============================================

export function setActiveIdentity(state: XPState, identity: IdentityType): XPState {
  return {
    ...state,
    activeIdentity: identity,
  };
}

export function getIdentityBonuses(identity: IdentityType): string[] {
  const id = IDENTITIES[identity];
  const bonuses: string[] = [];
  
  for (const bonus of id.bonuses) {
    const percent = Math.round((bonus.multiplier - 1) * 100);
    bonuses.push(`+${percent}% ${bonus.category}`);
  }
  
  bonuses.push(id.specialAbility);
  
  return bonuses;
}

// ============================================
// STATS & ANALYTICS
// ============================================

export function getXPStats(state: XPState) {
  const categories = Object.keys(XP_CATEGORIES) as XPCategory[];
  
  return {
    totalXP: categories.reduce((sum, cat) => sum + state.totals[cat], 0),
    totalLevels: categories.reduce((sum, cat) => sum + state.levels[cat], 0),
    ascensionLevel: state.ascensionLevel,
    todayTotal: categories.reduce((sum, cat) => sum + state.todayXP[cat], 0),
    strongestCategory: categories.reduce((a, b) => 
      state.levels[a] > state.levels[b] ? a : b
    ),
    weakestCategory: categories.reduce((a, b) => 
      state.levels[a] < state.levels[b] ? a : b
    ),
    categoryProgress: categories.map(cat => ({
      category: cat,
      level: state.levels[cat],
      xp: state.totals[cat],
      progress: getLevelProgress(state.totals[cat]),
      toNextLevel: getXPForLevel(state.levels[cat] + 1) - state.totals[cat],
    })),
  };
}

// ============================================
// SKILL CHECKS
// ============================================

export function hasSkill(state: XPState, skillId: string): boolean {
  return state.unlockedSkills.includes(skillId);
}

export function getAvailableSkills(state: XPState): Skill[] {
  const available: Skill[] = [];
  
  for (const [category, skills] of Object.entries(SKILL_TREES)) {
    for (const skill of skills) {
      const level = state.levels[category as XPCategory];
      if (level >= skill.levelRequired && !state.unlockedSkills.includes(skill.id)) {
        available.push(skill);
      }
    }
  }
  
  return available;
}

export function getUnlockedSkillDetails(state: XPState): Skill[] {
  const unlocked: Skill[] = [];
  
  for (const skills of Object.values(SKILL_TREES)) {
    for (const skill of skills) {
      if (state.unlockedSkills.includes(skill.id)) {
        unlocked.push(skill);
      }
    }
  }
  
  return unlocked;
}

// ============================================
// ACTIVITY DETECTION (for auto-awarding XP)
// ============================================

export function detectActivity(description: string): string | null {
  const lower = description.toLowerCase();
  
  // Habits
  if (lower.includes('workout') || lower.includes('gym') || lower.includes('exercise')) {
    return 'habit_completed';
  }
  if (lower.includes('meditat') || lower.includes('journal')) {
    return lower.includes('journal') ? 'journal_entry' : 'habit_completed';
  }
  if (lower.includes('morning routine') || lower.includes('morning ritual')) {
    return 'morning_routine';
  }
  
  // Tasks
  if (lower.includes('completed') || lower.includes('finished') || lower.includes('done')) {
    if (lower.includes('high priority') || lower.includes('important') || lower.includes('urgent')) {
      return 'task_completed_high_priority';
    }
    return 'task_completed';
  }
  
  // Deals
  if (lower.includes('deal') || lower.includes('loan')) {
    if (lower.includes('won') || lower.includes('closed') || lower.includes('funded')) {
      return lower.includes('funded') ? 'loan_funded' : 'deal_won';
    }
    if (lower.includes('advanced') || lower.includes('moved') || lower.includes('progress')) {
      return 'deal_advanced';
    }
  }
  
  // Power moves
  if (lower.includes('negotiat')) {
    return 'negotiation_win';
  }
  if (lower.includes('boundary') || lower.includes('said no')) {
    return 'boundary_set';
  }
  if (lower.includes('difficult conversation') || lower.includes('hard conversation')) {
    return 'difficult_conversation';
  }
  
  // Identity
  if (lower.includes('stoic') || lower.includes('calm') || lower.includes('composed')) {
    return 'stoic_moment';
  }
  if (lower.includes('emotional mastery') || lower.includes('kept my cool')) {
    return 'emotional_mastery';
  }
  if (lower.includes('chose the hard') || lower.includes('right thing')) {
    return 'chose_hard_right';
  }
  if (lower.includes('father') || lower.includes('kids') || lower.includes('son')) {
    return 'father_moment';
  }
  if (lower.includes('taught') || lower.includes('teaching')) {
    return 'teaching_moment';
  }
  
  // Systems
  if (lower.includes('system') || lower.includes('automat') || lower.includes('built')) {
    return 'system_built';
  }
  
  // Streaks
  if (lower.includes('streak')) {
    if (lower.includes('30') || lower.includes('month')) return 'streak_milestone_30';
    if (lower.includes('14') || lower.includes('two week')) return 'streak_milestone_14';
    if (lower.includes('7') || lower.includes('week')) return 'streak_milestone_7';
    return 'streak_maintained';
  }
  
  // Follow-ups
  if (lower.includes('follow') && (lower.includes('up') || lower.includes('sent'))) {
    return 'follow_up_sent';
  }
  
  return null;
}

// ============================================
// XP ANIMATION DATA
// ============================================

export interface XPAnimationData {
  category: XPCategory;
  amount: number;
  wasCrit: boolean;
  levelUp: boolean;
  newLevel?: number;
  skillUnlocked?: string;
  identityActivated?: IdentityType;
}

export function createAnimationData(gain: XPGain, prevState: XPState, newState: XPState): XPAnimationData {
  return {
    category: gain.category,
    amount: gain.finalXP,
    wasCrit: gain.wasCrit,
    levelUp: gain.levelUp,
    newLevel: gain.newLevel,
    skillUnlocked: gain.skillsUnlocked[0],
    identityActivated: newState.activeIdentity !== prevState.activeIdentity ? newState.activeIdentity || undefined : undefined,
  };
}