// Pulse OS - XP Ascension Engine Types
// lib/xp/types.ts

// ============================================
// XP CATEGORIES
// ============================================

export type XPCategory = 'DXP' | 'PXP' | 'IXP' | 'AXP' | 'MXP';

export const XP_CATEGORIES: Record<XPCategory, {
  name: string;
  fullName: string;
  description: string;
  color: string;
  gradient: string;
  icon: string;
}> = {
  DXP: {
    name: 'DXP',
    fullName: 'Discipline XP',
    description: 'Habits, follow-ups, focus, avoiding distractions',
    color: '#f59e0b', // amber
    gradient: 'from-amber-500 to-orange-500',
    icon: '⚔️',
  },
  PXP: {
    name: 'PXP',
    fullName: 'Power XP',
    description: 'Influence, negotiation, leadership, boundaries',
    color: '#ef4444', // red
    gradient: 'from-red-500 to-rose-500',
    icon: '👑',
  },
  IXP: {
    name: 'IXP',
    fullName: 'Identity XP',
    description: 'Stoic actions, emotional mastery, integrity',
    color: '#8b5cf6', // violet
    gradient: 'from-violet-500 to-purple-500',
    icon: '🧬',
  },
  AXP: {
    name: 'AXP',
    fullName: 'Achievement XP',
    description: 'Deal wins, milestones, systems built',
    color: '#10b981', // emerald
    gradient: 'from-emerald-500 to-green-500',
    icon: '🏆',
  },
  MXP: {
    name: 'MXP',
    fullName: 'Momentum XP',
    description: 'Streaks, consistency, no-zero days',
    color: '#06b6d4', // cyan
    gradient: 'from-cyan-500 to-blue-500',
    icon: '🔥',
  },
};

// ============================================
// IDENTITY RESONANCE
// ============================================

export type IdentityType = 
  | 'Stoic' 
  | 'Samurai' 
  | 'Builder' 
  | 'Father' 
  | 'Warrior' 
  | 'Strategist' 
  | 'Leader' 
  | 'Creator';

export const IDENTITIES: Record<IdentityType, {
  name: string;
  description: string;
  icon: string;
  color: string;
  bonuses: {
    category: XPCategory;
    multiplier: number;
  }[];
  specialAbility: string;
}> = {
  Stoic: {
    name: 'Stoic',
    description: 'Master of emotions and adversity',
    icon: '🏛️',
    color: '#6366f1',
    bonuses: [
      { category: 'IXP', multiplier: 1.2 },
      { category: 'DXP', multiplier: 1.1 },
    ],
    specialAbility: 'Crit Window opens during conflict',
  },
  Samurai: {
    name: 'Samurai',
    description: 'Decisive action, clean cuts',
    icon: '⚔️',
    color: '#dc2626',
    bonuses: [
      { category: 'DXP', multiplier: 1.15 },
      { category: 'IXP', multiplier: 1.1 },
    ],
    specialAbility: 'No hesitation penalty',
  },
  Builder: {
    name: 'Builder',
    description: 'Systems architect, creator of leverage',
    icon: '🏗️',
    color: '#f59e0b',
    bonuses: [
      { category: 'AXP', multiplier: 1.25 },
      { category: 'MXP', multiplier: 1.1 },
    ],
    specialAbility: '2× AXP for systems creation',
  },
  Father: {
    name: 'Father',
    description: 'Teacher, protector, leader by example',
    icon: '👨‍👦',
    color: '#10b981',
    bonuses: [
      { category: 'IXP', multiplier: 1.2 },
      { category: 'PXP', multiplier: 1.1 },
    ],
    specialAbility: 'Crit Moments with family actions',
  },
  Warrior: {
    name: 'Warrior',
    description: 'Relentless pursuit, never backing down',
    icon: '🛡️',
    color: '#ef4444',
    bonuses: [
      { category: 'DXP', multiplier: 1.2 },
      { category: 'AXP', multiplier: 1.1 },
    ],
    specialAbility: 'Streak protection in hard times',
  },
  Strategist: {
    name: 'Strategist',
    description: 'Long-term thinking, chess moves',
    icon: '♟️',
    color: '#8b5cf6',
    bonuses: [
      { category: 'PXP', multiplier: 1.15 },
      { category: 'AXP', multiplier: 1.15 },
    ],
    specialAbility: 'Bonus XP for planned actions',
  },
  Leader: {
    name: 'Leader',
    description: 'Influence, authority, command presence',
    icon: '🎖️',
    color: '#0891b2',
    bonuses: [
      { category: 'PXP', multiplier: 1.25 },
      { category: 'IXP', multiplier: 1.05 },
    ],
    specialAbility: 'Authority Aura passive unlock',
  },
  Creator: {
    name: 'Creator',
    description: 'Building something from nothing',
    icon: '✨',
    color: '#ec4899',
    bonuses: [
      { category: 'AXP', multiplier: 1.2 },
      { category: 'MXP', multiplier: 1.15 },
    ],
    specialAbility: 'Flow state bonus',
  },
};

// ============================================
// ACTIVITY → XP MAPPING
// ============================================

export interface XPReward {
  baseXP: number;
  category: XPCategory;
  identities: IdentityType[];
  critEligible?: boolean;
  description: string;
}

export const ACTIVITY_XP_MAP: Record<string, XPReward> = {
  // DISCIPLINE (DXP)
  'habit_completed': { baseXP: 15, category: 'DXP', identities: ['Warrior', 'Samurai'], description: 'Habit completed' },
  'follow_up_sent': { baseXP: 20, category: 'DXP', identities: ['Strategist'], description: 'Follow-up sent' },
  'task_completed': { baseXP: 25, category: 'DXP', identities: ['Builder', 'Warrior'], description: 'Task completed' },
  'task_completed_high_priority': { baseXP: 40, category: 'DXP', identities: ['Samurai', 'Warrior'], critEligible: true, description: 'High priority task' },
  'avoided_distraction': { baseXP: 10, category: 'DXP', identities: ['Stoic', 'Samurai'], description: 'Avoided distraction' },
  'morning_routine': { baseXP: 30, category: 'DXP', identities: ['Warrior', 'Stoic'], description: 'Morning routine' },
  'journal_entry': { baseXP: 20, category: 'DXP', identities: ['Stoic', 'Creator'], description: 'Journal entry' },
  
  // POWER (PXP)
  'negotiation_win': { baseXP: 75, category: 'PXP', identities: ['Leader', 'Strategist'], critEligible: true, description: 'Negotiation win' },
  'boundary_set': { baseXP: 40, category: 'PXP', identities: ['Stoic', 'Leader'], critEligible: true, description: 'Boundary set' },
  'difficult_conversation': { baseXP: 50, category: 'PXP', identities: ['Leader', 'Stoic'], critEligible: true, description: 'Difficult conversation' },
  'executive_decision': { baseXP: 35, category: 'PXP', identities: ['Leader', 'Strategist'], description: 'Executive decision' },
  'influence_move': { baseXP: 30, category: 'PXP', identities: ['Strategist', 'Leader'], description: 'Influence move' },
  
  // IDENTITY (IXP)
  'stoic_moment': { baseXP: 30, category: 'IXP', identities: ['Stoic'], critEligible: true, description: 'Stoic moment' },
  'emotional_mastery': { baseXP: 40, category: 'IXP', identities: ['Stoic', 'Warrior'], critEligible: true, description: 'Emotional mastery' },
  'integrity_action': { baseXP: 35, category: 'IXP', identities: ['Samurai', 'Stoic'], description: 'Integrity action' },
  'chose_hard_right': { baseXP: 50, category: 'IXP', identities: ['Samurai', 'Stoic', 'Warrior'], critEligible: true, description: 'Chose the harder right' },
  'father_moment': { baseXP: 45, category: 'IXP', identities: ['Father'], critEligible: true, description: 'Father moment' },
  'teaching_moment': { baseXP: 35, category: 'IXP', identities: ['Father', 'Leader'], description: 'Teaching moment' },
  
  // ACHIEVEMENT (AXP)
  'deal_won': { baseXP: 150, category: 'AXP', identities: ['Builder', 'Strategist'], critEligible: true, description: 'Deal won' },
  'deal_advanced': { baseXP: 50, category: 'AXP', identities: ['Builder', 'Strategist'], description: 'Deal advanced' },
  'system_built': { baseXP: 100, category: 'AXP', identities: ['Builder', 'Creator'], critEligible: true, description: 'System built' },
  'milestone_reached': { baseXP: 75, category: 'AXP', identities: ['Warrior', 'Builder'], description: 'Milestone reached' },
  'project_completed': { baseXP: 80, category: 'AXP', identities: ['Builder'], description: 'Project completed' },
  'loan_funded': { baseXP: 200, category: 'AXP', identities: ['Builder', 'Leader'], critEligible: true, description: 'Loan funded' },
  
  // MOMENTUM (MXP)
  'streak_maintained': { baseXP: 20, category: 'MXP', identities: ['Warrior'], description: 'Streak maintained' },
  'streak_milestone_7': { baseXP: 50, category: 'MXP', identities: ['Warrior', 'Samurai'], description: '7-day streak' },
  'streak_milestone_14': { baseXP: 100, category: 'MXP', identities: ['Warrior', 'Samurai'], description: '14-day streak' },
  'streak_milestone_30': { baseXP: 200, category: 'MXP', identities: ['Warrior', 'Samurai'], critEligible: true, description: '30-day streak' },
  'no_zero_day': { baseXP: 25, category: 'MXP', identities: ['Warrior'], description: 'No zero day' },
  'daily_targets_hit': { baseXP: 35, category: 'MXP', identities: ['Builder', 'Warrior'], description: 'Daily targets hit' },
  'weekly_review': { baseXP: 40, category: 'MXP', identities: ['Strategist', 'Builder'], description: 'Weekly review' },
  
  // BOSS FIGHTS (Special)
  'boss_fight_completed': { baseXP: 300, category: 'AXP', identities: ['Warrior', 'Samurai', 'Leader'], critEligible: true, description: 'Boss fight completed' },
};

// ============================================
// LEVELING
// ============================================

// XP required for each level (exponential curve)
export function getXPForLevel(level: number): number {
  // Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 250 XP, etc.
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(1.5, level - 2));
}

// Get level from total XP
export function getLevelFromXP(xp: number): number {
  let level = 1;
  while (getXPForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
}

// Get progress to next level (0-1)
export function getLevelProgress(xp: number): number {
  const currentLevel = getLevelFromXP(xp);
  const currentLevelXP = getXPForLevel(currentLevel);
  const nextLevelXP = getXPForLevel(currentLevel + 1);
  return (xp - currentLevelXP) / (nextLevelXP - currentLevelXP);
}

// Calculate Ascension Level
export function calculateAscensionLevel(levels: Record<XPCategory, number>): number {
  const sum = levels.DXP + levels.PXP + levels.IXP + levels.AXP + levels.MXP;
  return Math.floor(sum / 5);
}

// ============================================
// SKILL TREES
// ============================================

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: XPCategory;
  levelRequired: number;
  icon: string;
}

export const SKILL_TREES: Record<XPCategory, Skill[]> = {
  DXP: [
    { id: 'focus_surge', name: 'Focus Surge', description: 'Deep work sessions give bonus XP', category: 'DXP', levelRequired: 3, icon: '🎯' },
    { id: 'no_hesitation', name: 'No Hesitation', description: 'Instant action removes procrastination penalty', category: 'DXP', levelRequired: 5, icon: '⚡' },
    { id: 'auto_follow', name: 'Auto-Follow', description: 'Follow-ups create themselves', category: 'DXP', levelRequired: 7, icon: '🔄' },
    { id: 'iron_routine', name: 'Iron Routine', description: 'Morning routine streaks are protected', category: 'DXP', levelRequired: 10, icon: '🛡️' },
    { id: 'mind_lock', name: 'Mind Lock', description: 'Distraction immunity for 2 hours daily', category: 'DXP', levelRequired: 15, icon: '🔒' },
  ],
  PXP: [
    { id: 'exec_presence', name: 'Executive Presence', description: 'Meetings give bonus PXP', category: 'PXP', levelRequired: 3, icon: '👔' },
    { id: 'boundary_mastery', name: 'Boundary Mastery', description: 'Saying no gives 2× PXP', category: 'PXP', levelRequired: 5, icon: '🚧' },
    { id: 'influence_pulse', name: 'Influence Pulse', description: 'Detect power dynamics in rooms', category: 'PXP', levelRequired: 7, icon: '📡' },
    { id: 'authority_aura', name: 'Authority Aura', description: 'Passive respect modifier', category: 'PXP', levelRequired: 10, icon: '👑' },
    { id: 'command_voice', name: 'Command Voice', description: 'Requests become directives', category: 'PXP', levelRequired: 15, icon: '🎤' },
  ],
  IXP: [
    { id: 'stoic_flame', name: 'Stoic Flame', description: 'Adversity gives bonus IXP', category: 'IXP', levelRequired: 3, icon: '🔥' },
    { id: 'samurai_heart', name: 'Samurai Heart', description: 'Clean cuts are always crits', category: 'IXP', levelRequired: 5, icon: '⚔️' },
    { id: 'calm_under_fire', name: 'Calm Under Fire', description: 'Stress unlocks crit windows', category: 'IXP', levelRequired: 7, icon: '🧘' },
    { id: 'identity_lock', name: 'Identity Lock', description: 'Active identity persists longer', category: 'IXP', levelRequired: 10, icon: '🔐' },
    { id: 'north_star', name: 'North Star Clarity', description: 'Always know the right path', category: 'IXP', levelRequired: 15, icon: '⭐' },
  ],
  AXP: [
    { id: 'deal_accelerator', name: 'Deal Accelerator', description: 'Deals advance faster', category: 'AXP', levelRequired: 3, icon: '🚀' },
    { id: 'pipeline_momentum', name: 'Pipeline Momentum', description: 'Multiple deals boost each other', category: 'AXP', levelRequired: 5, icon: '📈' },
    { id: 'systems_architect', name: 'Systems Architect', description: 'Building systems gives 2× AXP', category: 'AXP', levelRequired: 7, icon: '🏗️' },
    { id: 'precision_execution', name: 'Precision Execution', description: 'First-time wins give bonus', category: 'AXP', levelRequired: 10, icon: '🎯' },
    { id: 'master_closer', name: 'Master Closer', description: 'Deal wins trigger chain bonuses', category: 'AXP', levelRequired: 15, icon: '🏆' },
  ],
  MXP: [
    { id: 'combo_chain', name: 'Combo Chain', description: 'Back-to-back tasks multiply', category: 'MXP', levelRequired: 3, icon: '⛓️' },
    { id: 'hot_streak', name: 'Hot Streak', description: 'Streaks give increasing bonuses', category: 'MXP', levelRequired: 5, icon: '🔥' },
    { id: 'flow_surge', name: 'Flow Surge', description: 'Flow state detection and boost', category: 'MXP', levelRequired: 7, icon: '🌊' },
    { id: 'no_zero_engine', name: 'No Zero Day Engine', description: 'Even small wins count big', category: 'MXP', levelRequired: 10, icon: '⚙️' },
    { id: 'consistency_lock', name: 'Consistency Lock', description: 'Streaks never break on rest days', category: 'MXP', levelRequired: 15, icon: '🔒' },
  ],
};

// ============================================
// CRIT SYSTEM
// ============================================

export interface CritWindow {
  active: boolean;
  multiplier: number; // 2-4×
  reason: string;
  expiresAt: Date | null;
}

export const CRIT_TRIGGERS = [
  'Acted within 2 minutes of deciding',
  'Handled conflict with calm',
  'Completed something you avoided',
  'Chose long-term over short-term',
  'Made a meaningful father moment',
  'Built a system that improves your life',
  'Said no to protect your priorities',
  'Had a breakthrough realization',
];

// ============================================
// BOSS FIGHTS
// ============================================

export interface BossFight {
  id: string;
  name: string;
  description: string;
  category: XPCategory;
  difficulty: 'Normal' | 'Hard' | 'Epic';
  xpReward: number;
  identityReward: IdentityType[];
  skillUnlock?: string;
  deadline?: Date;
  completed: boolean;
}

export const BOSS_FIGHT_TEMPLATES = [
  { name: 'The Hard Conversation', description: 'Have that difficult conversation you\'ve been avoiding', category: 'PXP' as XPCategory, difficulty: 'Hard' as const },
  { name: 'The Avoided Deal', description: 'Push forward the deal you\'ve been procrastinating on', category: 'AXP' as XPCategory, difficulty: 'Hard' as const },
  { name: 'The Delayed Decision', description: 'Make the decision you\'ve been putting off', category: 'IXP' as XPCategory, difficulty: 'Normal' as const },
  { name: 'The Broken Habit', description: 'Restart and commit to a habit you dropped', category: 'DXP' as XPCategory, difficulty: 'Normal' as const },
  { name: 'The System Build', description: 'Create a system that will save you hours', category: 'AXP' as XPCategory, difficulty: 'Epic' as const },
  { name: 'The Confrontation', description: 'Set a boundary with someone who crossed the line', category: 'PXP' as XPCategory, difficulty: 'Epic' as const },
  { name: 'The Fear Task', description: 'Do the one thing that scares you most this week', category: 'IXP' as XPCategory, difficulty: 'Epic' as const },
];