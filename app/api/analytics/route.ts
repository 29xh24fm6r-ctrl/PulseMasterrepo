import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const now = new Date();
  const xpByDay = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now); date.setDate(date.getDate() - (29 - i));
    return { date: date.toISOString().split("T")[0], value: Math.floor(Math.random() * 300) + 100 };
  });
  const habitCompletionRate = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(now); date.setDate(date.getDate() - (13 - i));
    return { date: date.toISOString().split("T")[0], rate: Math.floor(Math.random() * 40) + 60 };
  });

  const data = {
    overview: { totalXP: 12450, level: 15, tasksCompleted: 234, dealsValue: 475000, streakDays: 12, goalsProgress: 68 },
    trends: { xpByDay, habitCompletionRate },
    distributions: {
      xpByCategory: [
        { category: "Deal XP", value: 3200, color: "#3b82f6" },
        { category: "People XP", value: 2800, color: "#ec4899" },
        { category: "Inner XP", value: 4100, color: "#8b5cf6" },
        { category: "Auto XP", value: 1500, color: "#f59e0b" },
        { category: "Maint XP", value: 850, color: "#10b981" },
      ],
      tasksByPriority: [{ priority: "High", count: 45, color: "#ef4444" }, { priority: "Medium", count: 120, color: "#f59e0b" }, { priority: "Low", count: 69, color: "#6b7280" }],
      dealsByStage: [
        { stage: "Lead", count: 12, value: 180000, color: "#94a3b8" },
        { stage: "Qualified", count: 8, value: 240000, color: "#3b82f6" },
        { stage: "Proposal", count: 5, value: 175000, color: "#f59e0b" },
        { stage: "Closed Won", count: 15, value: 475000, color: "#10b981" },
      ],
      contactsByTier: [{ tier: "Platinum", count: 8, color: "#a855f7" }, { tier: "Gold", count: 15, color: "#f59e0b" }, { tier: "Silver", count: 25, color: "#94a3b8" }],
    },
    insights: { bestDay: "Tuesday", avgXPPerDay: 178, taskCompletionRate: 87, mostProductiveHour: 9, topArchetype: "Stoic", longestStreak: 21 },
    comparisons: { xpVsLastWeek: 12, tasksVsLastWeek: 8, habitsVsLastWeek: -3 },
  };

  return NextResponse.json({ data, period: "30d", generatedAt: now.toISOString() });
}
