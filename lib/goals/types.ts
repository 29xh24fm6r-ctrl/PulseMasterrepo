// Goals/OKR System Types

export type GoalStatus = "not_started" | "in_progress" | "at_risk" | "completed" | "abandoned";
export type GoalTimeframe = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
export type GoalCategory = "career" | "health" | "finance" | "relationships" | "personal" | "learning" | "creative";

export interface KeyResult {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  progress: number; // 0-100
  status: GoalStatus;
  updatedAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  timeframe: GoalTimeframe;
  status: GoalStatus;
  startDate: string;
  endDate: string;
  keyResults: KeyResult[];
  progress: number; // 0-100, calculated from key results
  xpReward: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoalStats {
  total: number;
  completed: number;
  inProgress: number;
  atRisk: number;
  notStarted: number;
  abandoned: number;
  avgProgress: number;
  xpEarned: number;
}

export const CATEGORY_CONFIG: Record<GoalCategory, { label: string; icon: string; color: string }> = {
  career: { label: "Career", icon: "💼", color: "#3b82f6" },
  health: { label: "Health", icon: "💪", color: "#10b981" },
  finance: { label: "Finance", icon: "💰", color: "#f59e0b" },
  relationships: { label: "Relationships", icon: "❤️", color: "#ec4899" },
  personal: { label: "Personal", icon: "🌟", color: "#8b5cf6" },
  learning: { label: "Learning", icon: "📚", color: "#06b6d4" },
  creative: { label: "Creative", icon: "🎨", color: "#f97316" },
};

export const STATUS_CONFIG: Record<GoalStatus, { label: string; color: string; bgColor: string }> = {
  not_started: { label: "Not Started", color: "#6b7280", bgColor: "bg-zinc-500/20" },
  in_progress: { label: "In Progress", color: "#3b82f6", bgColor: "bg-blue-500/20" },
  at_risk: { label: "At Risk", color: "#ef4444", bgColor: "bg-red-500/20" },
  completed: { label: "Completed", color: "#10b981", bgColor: "bg-emerald-500/20" },
  abandoned: { label: "Abandoned", color: "#6b7280", bgColor: "bg-zinc-500/20" },
};

export const TIMEFRAME_CONFIG: Record<GoalTimeframe, { label: string; xpMultiplier: number }> = {
  daily: { label: "Daily", xpMultiplier: 0.5 },
  weekly: { label: "Weekly", xpMultiplier: 1 },
  monthly: { label: "Monthly", xpMultiplier: 2 },
  quarterly: { label: "Quarterly", xpMultiplier: 4 },
  yearly: { label: "Yearly", xpMultiplier: 10 },
};

// Helper functions
export function calculateGoalProgress(keyResults: KeyResult[]): number {
  if (keyResults.length === 0) return 0;
  const totalProgress = keyResults.reduce((sum, kr) => sum + kr.progress, 0);
  return Math.round(totalProgress / keyResults.length);
}

export function calculateKeyResultProgress(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export function getGoalXpReward(timeframe: GoalTimeframe, keyResultCount: number): number {
  const baseXp = 50;
  const multiplier = TIMEFRAME_CONFIG[timeframe].xpMultiplier;
  const krBonus = keyResultCount * 10;
  return Math.round(baseXp * multiplier + krBonus);
}

export function determineGoalStatus(progress: number, endDate: string): GoalStatus {
  const now = new Date();
  const end = new Date(endDate);
  const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (progress >= 100) return "completed";
  if (daysRemaining < 0) return "at_risk"; // Past due
  if (progress === 0) return "not_started";
  
  // Calculate expected progress
  const start = new Date(end);
  start.setDate(start.getDate() - 30); // Assume 30 day goal for calculation
  const totalDays = 30;
  const daysPassed = totalDays - daysRemaining;
  const expectedProgress = (daysPassed / totalDays) * 100;
  
  if (progress < expectedProgress * 0.7) return "at_risk";
  return "in_progress";
}
