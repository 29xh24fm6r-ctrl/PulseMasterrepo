import { NextRequest, NextResponse } from "next/server";

// Monthly Review Data Structure
interface MonthlyReviewData {
  period: {
    start: string;
    end: string;
    monthName: string;
    year: number;
  };
  xp: {
    total: number;
    byCategory: Record<string, number>;
    weeklyBreakdown: { week: number; xp: number; startDate: string }[];
    critCount: number;
    identityBonuses: number;
    trend: "up" | "down" | "stable";
    vsLastMonth: number;
    dailyAverage: number;
  };
  tasks: {
    completed: number;
    created: number;
    completionRate: number;
    byPriority: { high: number; medium: number; low: number };
    bestWeek: number;
  };
  habits: {
    totalCompletions: number;
    streaks: { name: string; days: number; icon: string }[];
    completionRate: number;
    perfectDays: number;
    longestStreak: number;
  };
  identity: {
    actionsTracked: number;
    resonanceGained: number;
    topArchetype: string | null;
    valuesReinforced: string[];
    activationAchieved: boolean;
    streakDays: number;
  };
  deals: {
    closed: number;
    closedValue: number;
    newDeals: number;
    pipelineGrowth: number;
    avgDealSize: number;
  };
  highlights: {
    type: "achievement" | "milestone" | "streak" | "improvement";
    title: string;
    description: string;
    icon: string;
  }[];
  insights: string[];
  goals: {
    set: number;
    completed: number;
    inProgress: number;
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const monthOffset = parseInt(searchParams.get("monthOffset") || "0");

  try {
    // Calculate month boundaries
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    // Generate mock data (replace with real Notion queries)
    const data = generateMockMonthlyData(startOfMonth, endOfMonth, monthNames[targetMonth.getMonth()], targetMonth.getFullYear());

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error) {
    console.error("Monthly review error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to generate monthly review" },
      { status: 500 }
    );
  }
}

function generateMockMonthlyData(
  start: Date,
  end: Date,
  monthName: string,
  year: number
): MonthlyReviewData {
  const daysInMonth = end.getDate();
  const weeksInMonth = Math.ceil(daysInMonth / 7);

  // Generate weekly breakdown
  const weeklyBreakdown = [];
  for (let w = 0; w < weeksInMonth; w++) {
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() + w * 7);
    weeklyBreakdown.push({
      week: w + 1,
      xp: Math.floor(Math.random() * 800) + 400,
      startDate: weekStart.toISOString().split("T")[0],
    });
  }

  const totalXp = weeklyBreakdown.reduce((sum, w) => sum + w.xp, 0);
  const tasksCompleted = Math.floor(Math.random() * 60) + 40;
  const tasksCreated = tasksCompleted + Math.floor(Math.random() * 20);
  const habitCompletions = Math.floor(Math.random() * 100) + 50;
  const perfectDays = Math.floor(Math.random() * 15) + 5;

  // Generate highlights based on performance
  const highlights: MonthlyReviewData["highlights"] = [];

  if (totalXp > 2500) {
    highlights.push({
      type: "achievement",
      title: "XP Crusher",
      description: `Earned ${totalXp.toLocaleString()} XP this month!`,
      icon: "⚡",
    });
  }

  if (perfectDays >= 10) {
    highlights.push({
      type: "streak",
      title: "Habit Master",
      description: `${perfectDays} perfect habit days`,
      icon: "🔥",
    });
  }

  if (tasksCompleted >= 50) {
    highlights.push({
      type: "milestone",
      title: "Task Terminator",
      description: `Completed ${tasksCompleted} tasks`,
      icon: "✅",
    });
  }

  const closedDeals = Math.floor(Math.random() * 5) + 1;
  const closedValue = closedDeals * (Math.floor(Math.random() * 30000) + 10000);

  if (closedValue > 50000) {
    highlights.push({
      type: "achievement",
      title: "Deal Closer",
      description: `$${closedValue.toLocaleString()} in closed deals`,
      icon: "💰",
    });
  }

  // Generate insights
  const insights: string[] = [];
  const dailyAvg = Math.round(totalXp / daysInMonth);
  insights.push(`Your daily XP average was ${dailyAvg}. ${dailyAvg > 80 ? "Outstanding momentum!" : "Room to grow next month."}`);

  const completionRate = Math.round((tasksCompleted / tasksCreated) * 100);
  insights.push(`Task completion rate of ${completionRate}% ${completionRate > 80 ? "shows excellent execution." : "could improve with better prioritization."}`);

  if (perfectDays > 10) {
    insights.push(`${perfectDays} perfect habit days shows strong consistency. Keep it up!`);
  } else {
    insights.push(`Try to increase perfect habit days next month for compound growth.`);
  }

  if (closedDeals > 2) {
    insights.push(`Strong month for deals! ${closedDeals} closed with avg size $${Math.round(closedValue / closedDeals).toLocaleString()}.`);
  }

  return {
    period: {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
      monthName,
      year,
    },
    xp: {
      total: totalXp,
      byCategory: {
        DXP: Math.floor(totalXp * 0.35),
        PXP: Math.floor(totalXp * 0.2),
        IXP: Math.floor(totalXp * 0.25),
        AXP: Math.floor(totalXp * 0.1),
        MXP: Math.floor(totalXp * 0.1),
      },
      weeklyBreakdown,
      critCount: Math.floor(Math.random() * 20) + 5,
      identityBonuses: Math.floor(Math.random() * 15) + 3,
      trend: totalXp > 2000 ? "up" : totalXp > 1500 ? "stable" : "down",
      vsLastMonth: Math.floor(Math.random() * 40) - 10,
      dailyAverage: dailyAvg,
    },
    tasks: {
      completed: tasksCompleted,
      created: tasksCreated,
      completionRate,
      byPriority: {
        high: Math.floor(tasksCompleted * 0.3),
        medium: Math.floor(tasksCompleted * 0.5),
        low: Math.floor(tasksCompleted * 0.2),
      },
      bestWeek: Math.floor(Math.random() * weeksInMonth) + 1,
    },
    habits: {
      totalCompletions: habitCompletions,
      streaks: [
        { name: "Morning Routine", days: Math.floor(Math.random() * 25) + 5, icon: "🌅" },
        { name: "Exercise", days: Math.floor(Math.random() * 20) + 3, icon: "💪" },
        { name: "Reading", days: Math.floor(Math.random() * 15) + 2, icon: "📚" },
      ],
      completionRate: Math.floor(Math.random() * 30) + 60,
      perfectDays,
      longestStreak: Math.floor(Math.random() * 20) + 5,
    },
    identity: {
      actionsTracked: Math.floor(Math.random() * 40) + 15,
      resonanceGained: Math.floor(Math.random() * 300) + 100,
      topArchetype: ["Stoic", "Builder", "Strategist", "Leader", "Creator"][Math.floor(Math.random() * 5)],
      valuesReinforced: ["Discipline", "Growth", "Excellence", "Impact"].slice(0, Math.floor(Math.random() * 3) + 2),
      activationAchieved: Math.random() > 0.5,
      streakDays: Math.floor(Math.random() * 20) + 5,
    },
    deals: {
      closed: closedDeals,
      closedValue,
      newDeals: Math.floor(Math.random() * 10) + 3,
      pipelineGrowth: Math.floor(Math.random() * 50000) + 10000,
      avgDealSize: Math.round(closedValue / closedDeals),
    },
    highlights,
    insights,
    goals: {
      set: Math.floor(Math.random() * 5) + 3,
      completed: Math.floor(Math.random() * 3) + 1,
      inProgress: Math.floor(Math.random() * 3) + 1,
    },
  };
}
