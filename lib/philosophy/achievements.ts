// Achievement Definitions for Philosophy Dojo

export type AchievementCategory = 
  | 'streak' 
  | 'skills' 
  | 'mastery' 
  | 'cross_training' 
  | 'dedication' 
  | 'special';

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  xpReward: number;
  condition: AchievementCondition;
  secret?: boolean; // Hidden until unlocked
}

export interface AchievementCondition {
  type: 'streak' | 'skills_mastered' | 'tree_complete' | 'trees_started' | 'mentor_sessions' | 'total_xp' | 'specific';
  value: number;
  treeId?: string; // For tree-specific achievements
  skillIds?: string[]; // For specific skill achievements
}

export interface UserAchievement {
  achievementId: string;
  unlockedAt: string;
  notified: boolean;
}

// Rarity colors
export const RARITY_COLORS: Record<AchievementRarity, { bg: string; border: string; text: string }> = {
  common: { bg: 'bg-zinc-500/20', border: 'border-zinc-500/50', text: 'text-zinc-400' },
  uncommon: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400' },
  rare: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400' },
  epic: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400' },
  legendary: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400' },
};

// ============================================
// STREAK ACHIEVEMENTS
// ============================================

const STREAK_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'streak_3',
    name: 'Building Momentum',
    description: 'Maintain a 3-day training streak',
    icon: '✨',
    category: 'streak',
    rarity: 'common',
    xpReward: 50,
    condition: { type: 'streak', value: 3 },
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day training streak',
    icon: '🔥',
    category: 'streak',
    rarity: 'uncommon',
    xpReward: 100,
    condition: { type: 'streak', value: 7 },
  },
  {
    id: 'streak_14',
    name: 'Fortnight of Focus',
    description: 'Maintain a 14-day training streak',
    icon: '🔥',
    category: 'streak',
    rarity: 'rare',
    xpReward: 200,
    condition: { type: 'streak', value: 14 },
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day training streak',
    icon: '🔥',
    category: 'streak',
    rarity: 'epic',
    xpReward: 500,
    condition: { type: 'streak', value: 30 },
  },
  {
    id: 'streak_100',
    name: 'Century of Discipline',
    description: 'Maintain a 100-day training streak',
    icon: '💯',
    category: 'streak',
    rarity: 'legendary',
    xpReward: 2000,
    condition: { type: 'streak', value: 100 },
  },
];

// ============================================
// SKILL ACHIEVEMENTS
// ============================================

const SKILL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_skill',
    name: 'First Steps',
    description: 'Master your first skill',
    icon: '🌱',
    category: 'skills',
    rarity: 'common',
    xpReward: 25,
    condition: { type: 'skills_mastered', value: 1 },
  },
  {
    id: 'skills_5',
    name: 'Apprentice',
    description: 'Master 5 skills',
    icon: '📚',
    category: 'skills',
    rarity: 'common',
    xpReward: 75,
    condition: { type: 'skills_mastered', value: 5 },
  },
  {
    id: 'skills_10',
    name: 'Student',
    description: 'Master 10 skills',
    icon: '🎓',
    category: 'skills',
    rarity: 'uncommon',
    xpReward: 150,
    condition: { type: 'skills_mastered', value: 10 },
  },
  {
    id: 'skills_20',
    name: 'Scholar',
    description: 'Master 20 skills',
    icon: '📖',
    category: 'skills',
    rarity: 'rare',
    xpReward: 300,
    condition: { type: 'skills_mastered', value: 20 },
  },
  {
    id: 'skills_42',
    name: 'Philosopher',
    description: 'Master all 42 skills',
    icon: '🏆',
    category: 'skills',
    rarity: 'legendary',
    xpReward: 1000,
    condition: { type: 'skills_mastered', value: 42 },
  },
];

// ============================================
// MASTERY ACHIEVEMENTS (Complete Trees)
// ============================================

const MASTERY_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'master_stoicism',
    name: 'Stoic Sage',
    description: 'Complete the entire Stoicism skill tree',
    icon: '🏛️',
    category: 'mastery',
    rarity: 'epic',
    xpReward: 500,
    condition: { type: 'tree_complete', value: 1, treeId: 'stoicism' },
  },
  {
    id: 'master_samurai',
    name: 'Way of the Sword',
    description: 'Complete the entire Samurai skill tree',
    icon: '⚔️',
    category: 'mastery',
    rarity: 'epic',
    xpReward: 500,
    condition: { type: 'tree_complete', value: 1, treeId: 'samurai' },
  },
  {
    id: 'master_taoism',
    name: 'One with the Tao',
    description: 'Complete the entire Taoism skill tree',
    icon: '☯️',
    category: 'mastery',
    rarity: 'epic',
    xpReward: 500,
    condition: { type: 'tree_complete', value: 1, treeId: 'taoism' },
  },
  {
    id: 'master_zen',
    name: 'Awakened Mind',
    description: 'Complete the entire Zen skill tree',
    icon: '🧘',
    category: 'mastery',
    rarity: 'epic',
    xpReward: 500,
    condition: { type: 'tree_complete', value: 1, treeId: 'zen' },
  },
  {
    id: 'master_discipline',
    name: 'Unbreakable',
    description: 'Complete the entire Discipline skill tree',
    icon: '💀',
    category: 'mastery',
    rarity: 'epic',
    xpReward: 500,
    condition: { type: 'tree_complete', value: 1, treeId: 'discipline' },
  },
  {
    id: 'master_effectiveness',
    name: 'Highly Effective',
    description: 'Complete the entire 7 Habits skill tree',
    icon: '📘',
    category: 'mastery',
    rarity: 'epic',
    xpReward: 500,
    condition: { type: 'tree_complete', value: 1, treeId: 'effectiveness' },
  },
];

// ============================================
// CROSS-TRAINING ACHIEVEMENTS
// ============================================

const CROSS_TRAINING_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'cross_2',
    name: 'Open Mind',
    description: 'Master skills from 2 different philosophy trees',
    icon: '🌐',
    category: 'cross_training',
    rarity: 'uncommon',
    xpReward: 100,
    condition: { type: 'trees_started', value: 2 },
  },
  {
    id: 'cross_4',
    name: 'Eclectic Wisdom',
    description: 'Master skills from 4 different philosophy trees',
    icon: '🔮',
    category: 'cross_training',
    rarity: 'rare',
    xpReward: 250,
    condition: { type: 'trees_started', value: 4 },
  },
  {
    id: 'cross_all',
    name: 'Universal Mind',
    description: 'Master skills from all 6 philosophy trees',
    icon: '🌌',
    category: 'cross_training',
    rarity: 'epic',
    xpReward: 500,
    condition: { type: 'trees_started', value: 6 },
  },
  {
    id: 'master_all_trees',
    name: 'Omni-Philosopher',
    description: 'Complete all 6 philosophy skill trees',
    icon: '👑',
    category: 'cross_training',
    rarity: 'legendary',
    xpReward: 2000,
    condition: { type: 'tree_complete', value: 6 },
  },
];

// ============================================
// SPECIAL ACHIEVEMENTS
// ============================================

const SPECIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'inner_citadel',
    name: 'The Inner Citadel',
    description: 'Master the final Stoicism skill',
    icon: '🏰',
    category: 'special',
    rarity: 'rare',
    xpReward: 200,
    condition: { type: 'specific', value: 1, skillIds: ['inner_citadel'] },
  },
  {
    id: 'way_of_strategy',
    name: 'Master Strategist',
    description: 'Master the final Samurai skill',
    icon: '🗡️',
    category: 'special',
    rarity: 'rare',
    xpReward: 200,
    condition: { type: 'specific', value: 1, skillIds: ['way_of_strategy'] },
  },
  {
    id: 'satori',
    name: 'Satori',
    description: 'Achieve sudden awakening in Zen',
    icon: '💎',
    category: 'special',
    rarity: 'rare',
    xpReward: 200,
    condition: { type: 'specific', value: 1, skillIds: ['satori'] },
  },
  {
    id: 'stay_hard',
    name: 'Stay Hard',
    description: 'Complete the ultimate Discipline challenge',
    icon: '💀',
    category: 'special',
    rarity: 'rare',
    xpReward: 200,
    condition: { type: 'specific', value: 1, skillIds: ['stay_hard'] },
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Complete training before 6am',
    icon: '🌅',
    category: 'special',
    rarity: 'uncommon',
    xpReward: 50,
    condition: { type: 'specific', value: 1 },
    secret: true,
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Complete training after midnight',
    icon: '🦉',
    category: 'special',
    rarity: 'uncommon',
    xpReward: 50,
    condition: { type: 'specific', value: 1 },
    secret: true,
  },
];

// ============================================
// ALL ACHIEVEMENTS
// ============================================

export const ALL_ACHIEVEMENTS: Achievement[] = [
  ...STREAK_ACHIEVEMENTS,
  ...SKILL_ACHIEVEMENTS,
  ...MASTERY_ACHIEVEMENTS,
  ...CROSS_TRAINING_ACHIEVEMENTS,
  ...SPECIAL_ACHIEVEMENTS,
];

export function getAchievementById(id: string): Achievement | undefined {
  return ALL_ACHIEVEMENTS.find(a => a.id === id);
}

export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
  return ALL_ACHIEVEMENTS.filter(a => a.category === category);
}

export function getVisibleAchievements(unlockedIds: string[]): Achievement[] {
  return ALL_ACHIEVEMENTS.filter(a => !a.secret || unlockedIds.includes(a.id));
}
