// Achievement Badge System
// Defines all unlockable badges and their requirements

export type BadgeRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type BadgeCategory = "xp" | "streaks" | "tasks" | "deals" | "identity" | "habits" | "journal" | "special";

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  category: BadgeCategory;
  requirement: {
    type: string;
    threshold: number;
    description: string;
  };
  xpReward: number;
}

export interface UnlockedBadge {
  badgeId: string;
  unlockedAt: string;
  progress?: number;
}

export interface AchievementState {
  unlockedBadges: UnlockedBadge[];
  totalBadges: number;
  totalXpFromBadges: number;
  lastUnlocked: string | null;
}

// Rarity colors and multipliers
export const RARITY_CONFIG: Record<BadgeRarity, { color: string; bgColor: string; borderColor: string; glow: string; multiplier: number }> = {
  common: {
    color: "#9ca3af",
    bgColor: "bg-zinc-500/20",
    borderColor: "border-zinc-500/50",
    glow: "",
    multiplier: 1,
  },
  uncommon: {
    color: "#22c55e",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500/50",
    glow: "shadow-emerald-500/20",
    multiplier: 1.5,
  },
  rare: {
    color: "#3b82f6",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/50",
    glow: "shadow-blue-500/30",
    multiplier: 2,
  },
  epic: {
    color: "#a855f7",
    bgColor: "bg-purple-500/20",
    borderColor: "border-purple-500/50",
    glow: "shadow-purple-500/40",
    multiplier: 3,
  },
  legendary: {
    color: "#f59e0b",
    bgColor: "bg-amber-500/20",
    borderColor: "border-amber-500/50",
    glow: "shadow-amber-500/50",
    multiplier: 5,
  },
};

// All available badges
export const BADGES: Badge[] = [
  // ===== XP BADGES =====
  {
    id: "xp_1000",
    name: "First Steps",
    description: "Earn your first 1,000 XP",
    icon: "⚡",
    rarity: "common",
    category: "xp",
    requirement: { type: "total_xp", threshold: 1000, description: "Earn 1,000 total XP" },
    xpReward: 50,
  },
  {
    id: "xp_5000",
    name: "Getting Stronger",
    description: "Earn 5,000 total XP",
    icon: "💪",
    rarity: "uncommon",
    category: "xp",
    requirement: { type: "total_xp", threshold: 5000, description: "Earn 5,000 total XP" },
    xpReward: 100,
  },
  {
    id: "xp_10000",
    name: "Power Player",
    description: "Earn 10,000 total XP",
    icon: "🔥",
    rarity: "rare",
    category: "xp",
    requirement: { type: "total_xp", threshold: 10000, description: "Earn 10,000 total XP" },
    xpReward: 250,
  },
  {
    id: "xp_25000",
    name: "XP Master",
    description: "Earn 25,000 total XP",
    icon: "⭐",
    rarity: "epic",
    category: "xp",
    requirement: { type: "total_xp", threshold: 25000, description: "Earn 25,000 total XP" },
    xpReward: 500,
  },
  {
    id: "xp_100000",
    name: "Legendary Grinder",
    description: "Earn 100,000 total XP",
    icon: "👑",
    rarity: "legendary",
    category: "xp",
    requirement: { type: "total_xp", threshold: 100000, description: "Earn 100,000 total XP" },
    xpReward: 2000,
  },
  {
    id: "xp_daily_500",
    name: "Daily Crusher",
    description: "Earn 500 XP in a single day",
    icon: "📈",
    rarity: "rare",
    category: "xp",
    requirement: { type: "daily_xp", threshold: 500, description: "Earn 500 XP in one day" },
    xpReward: 150,
  },

  // ===== STREAK BADGES =====
  {
    id: "streak_7",
    name: "Week Warrior",
    description: "Maintain a 7-day streak",
    icon: "🔥",
    rarity: "common",
    category: "streaks",
    requirement: { type: "streak_days", threshold: 7, description: "7-day streak" },
    xpReward: 75,
  },
  {
    id: "streak_30",
    name: "Monthly Master",
    description: "Maintain a 30-day streak",
    icon: "🌟",
    rarity: "rare",
    category: "streaks",
    requirement: { type: "streak_days", threshold: 30, description: "30-day streak" },
    xpReward: 300,
  },
  {
    id: "streak_100",
    name: "Century Club",
    description: "Maintain a 100-day streak",
    icon: "💯",
    rarity: "epic",
    category: "streaks",
    requirement: { type: "streak_days", threshold: 100, description: "100-day streak" },
    xpReward: 1000,
  },
  {
    id: "streak_365",
    name: "Year of Excellence",
    description: "Maintain a 365-day streak",
    icon: "🏆",
    rarity: "legendary",
    category: "streaks",
    requirement: { type: "streak_days", threshold: 365, description: "365-day streak" },
    xpReward: 5000,
  },

  // ===== TASK BADGES =====
  {
    id: "tasks_10",
    name: "Task Starter",
    description: "Complete 10 tasks",
    icon: "✅",
    rarity: "common",
    category: "tasks",
    requirement: { type: "tasks_completed", threshold: 10, description: "Complete 10 tasks" },
    xpReward: 50,
  },
  {
    id: "tasks_50",
    name: "Task Tackler",
    description: "Complete 50 tasks",
    icon: "📋",
    rarity: "uncommon",
    category: "tasks",
    requirement: { type: "tasks_completed", threshold: 50, description: "Complete 50 tasks" },
    xpReward: 150,
  },
  {
    id: "tasks_100",
    name: "Task Terminator",
    description: "Complete 100 tasks",
    icon: "🎯",
    rarity: "rare",
    category: "tasks",
    requirement: { type: "tasks_completed", threshold: 100, description: "Complete 100 tasks" },
    xpReward: 300,
  },
  {
    id: "tasks_500",
    name: "Productivity Legend",
    description: "Complete 500 tasks",
    icon: "🚀",
    rarity: "epic",
    category: "tasks",
    requirement: { type: "tasks_completed", threshold: 500, description: "Complete 500 tasks" },
    xpReward: 1000,
  },
  {
    id: "tasks_high_10",
    name: "Priority Hunter",
    description: "Complete 10 high-priority tasks",
    icon: "🔴",
    rarity: "uncommon",
    category: "tasks",
    requirement: { type: "high_priority_tasks", threshold: 10, description: "Complete 10 high-priority tasks" },
    xpReward: 100,
  },

  // ===== DEAL BADGES =====
  {
    id: "deal_first",
    name: "First Close",
    description: "Close your first deal",
    icon: "🤝",
    rarity: "common",
    category: "deals",
    requirement: { type: "deals_closed", threshold: 1, description: "Close 1 deal" },
    xpReward: 100,
  },
  {
    id: "deals_10",
    name: "Deal Maker",
    description: "Close 10 deals",
    icon: "💼",
    rarity: "rare",
    category: "deals",
    requirement: { type: "deals_closed", threshold: 10, description: "Close 10 deals" },
    xpReward: 500,
  },
  {
    id: "deals_value_100k",
    name: "Six Figure Closer",
    description: "Close $100,000 in total deals",
    icon: "💰",
    rarity: "epic",
    category: "deals",
    requirement: { type: "deals_total_value", threshold: 100000, description: "Close $100K in deals" },
    xpReward: 1000,
  },
  {
    id: "deals_value_1m",
    name: "Million Dollar Player",
    description: "Close $1,000,000 in total deals",
    icon: "💎",
    rarity: "legendary",
    category: "deals",
    requirement: { type: "deals_total_value", threshold: 1000000, description: "Close $1M in deals" },
    xpReward: 5000,
  },

  // ===== IDENTITY BADGES =====
  {
    id: "identity_first_action",
    name: "Self Discovery",
    description: "Track your first identity action",
    icon: "🔮",
    rarity: "common",
    category: "identity",
    requirement: { type: "identity_actions", threshold: 1, description: "Track 1 identity action" },
    xpReward: 50,
  },
  {
    id: "identity_activation",
    name: "Archetype Awakened",
    description: "Activate your first archetype",
    icon: "⚡",
    rarity: "rare",
    category: "identity",
    requirement: { type: "archetypes_activated", threshold: 1, description: "Activate 1 archetype" },
    xpReward: 250,
  },
  {
    id: "identity_all_archetypes",
    name: "Master of All",
    description: "Discover all 10 archetypes",
    icon: "🏛️",
    rarity: "legendary",
    category: "identity",
    requirement: { type: "archetypes_discovered", threshold: 10, description: "Discover all archetypes" },
    xpReward: 2500,
  },
  {
    id: "identity_resonance_1000",
    name: "Resonance Rising",
    description: "Accumulate 1,000 total resonance",
    icon: "✨",
    rarity: "uncommon",
    category: "identity",
    requirement: { type: "total_resonance", threshold: 1000, description: "Earn 1,000 resonance" },
    xpReward: 150,
  },
  {
    id: "identity_north_star",
    name: "Vision Keeper",
    description: "Set your North Star vision and mission",
    icon: "🌟",
    rarity: "uncommon",
    category: "identity",
    requirement: { type: "north_star_set", threshold: 1, description: "Set North Star" },
    xpReward: 100,
  },

  // ===== HABIT BADGES =====
  {
    id: "habit_perfect_week",
    name: "Perfect Week",
    description: "Complete all habits for 7 consecutive days",
    icon: "🌈",
    rarity: "rare",
    category: "habits",
    requirement: { type: "perfect_habit_days", threshold: 7, description: "7 perfect habit days" },
    xpReward: 200,
  },
  {
    id: "habit_100_completions",
    name: "Habit Former",
    description: "Complete 100 habit check-ins",
    icon: "🔄",
    rarity: "uncommon",
    category: "habits",
    requirement: { type: "habit_completions", threshold: 100, description: "100 habit completions" },
    xpReward: 150,
  },
  {
    id: "habit_streak_30",
    name: "Habit Master",
    description: "30-day streak on any habit",
    icon: "💎",
    rarity: "epic",
    category: "habits",
    requirement: { type: "single_habit_streak", threshold: 30, description: "30-day habit streak" },
    xpReward: 500,
  },

  // ===== JOURNAL BADGES =====
  {
    id: "journal_first",
    name: "First Entry",
    description: "Write your first journal entry",
    icon: "📝",
    rarity: "common",
    category: "journal",
    requirement: { type: "journal_entries", threshold: 1, description: "Write 1 journal entry" },
    xpReward: 25,
  },
  {
    id: "journal_30",
    name: "Reflective Soul",
    description: "Write 30 journal entries",
    icon: "📓",
    rarity: "uncommon",
    category: "journal",
    requirement: { type: "journal_entries", threshold: 30, description: "Write 30 journal entries" },
    xpReward: 200,
  },
  {
    id: "journal_100",
    name: "Chronicle Keeper",
    description: "Write 100 journal entries",
    icon: "📚",
    rarity: "rare",
    category: "journal",
    requirement: { type: "journal_entries", threshold: 100, description: "Write 100 journal entries" },
    xpReward: 500,
  },

  // ===== SPECIAL BADGES =====
  {
    id: "special_early_adopter",
    name: "Early Adopter",
    description: "Join Pulse OS in its early days",
    icon: "🌱",
    rarity: "rare",
    category: "special",
    requirement: { type: "special", threshold: 1, description: "Early adopter" },
    xpReward: 500,
  },
  {
    id: "special_completionist",
    name: "Completionist",
    description: "Unlock 25 badges",
    icon: "🏅",
    rarity: "epic",
    category: "special",
    requirement: { type: "badges_unlocked", threshold: 25, description: "Unlock 25 badges" },
    xpReward: 1000,
  },
  {
    id: "special_all_badges",
    name: "Badge Collector",
    description: "Unlock all available badges",
    icon: "👑",
    rarity: "legendary",
    category: "special",
    requirement: { type: "badges_unlocked", threshold: 999, description: "Unlock all badges" }, // Will be set dynamically
    xpReward: 10000,
  },
  {
    id: "special_crit_master",
    name: "Critical Master",
    description: "Land 50 critical XP hits",
    icon: "💥",
    rarity: "epic",
    category: "special",
    requirement: { type: "crit_count", threshold: 50, description: "50 critical hits" },
    xpReward: 750,
  },
  {
    id: "special_night_owl",
    name: "Night Owl",
    description: "Complete tasks after midnight 10 times",
    icon: "🦉",
    rarity: "uncommon",
    category: "special",
    requirement: { type: "late_night_tasks", threshold: 10, description: "10 late-night tasks" },
    xpReward: 100,
  },
  {
    id: "special_weekend_warrior",
    name: "Weekend Warrior",
    description: "Earn 1,000 XP on weekends",
    icon: "🎮",
    rarity: "uncommon",
    category: "special",
    requirement: { type: "weekend_xp", threshold: 1000, description: "1,000 weekend XP" },
    xpReward: 150,
  },
];

// Helper functions
export function getBadgeById(id: string): Badge | undefined {
  return BADGES.find((b) => b.id === id);
}

export function getBadgesByCategory(category: BadgeCategory): Badge[] {
  return BADGES.filter((b) => b.category === category);
}

export function getBadgesByRarity(rarity: BadgeRarity): Badge[] {
  return BADGES.filter((b) => b.rarity === rarity);
}

export function getTotalBadgeCount(): number {
  return BADGES.length;
}

export function calculateBadgeProgress(badge: Badge, currentValue: number): number {
  return Math.min(100, Math.round((currentValue / badge.requirement.threshold) * 100));
}
