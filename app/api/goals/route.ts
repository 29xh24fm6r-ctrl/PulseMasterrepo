import { NextRequest, NextResponse } from "next/server";
import {
  Goal,
  GoalStats,
  GoalStatus,
  GoalCategory,
  GoalTimeframe,
  KeyResult,
  calculateGoalProgress,
  calculateKeyResultProgress,
  getGoalXpReward,
} from "@/lib/goals/types";

// Mock data generator
function generateMockGoals(): Goal[] {
  const now = new Date();
  const goals: Goal[] = [
    {
      id: "goal_1",
      title: "Close $500K in Q4 Revenue",
      description: "Hit quarterly sales target through new deals and upsells",
      category: "career",
      timeframe: "quarterly",
      status: "in_progress",
      startDate: new Date(now.getFullYear(), 9, 1).toISOString(),
      endDate: new Date(now.getFullYear(), 11, 31).toISOString(),
      keyResults: [
        {
          id: "kr_1_1",
          title: "Close 5 new enterprise deals",
          targetValue: 5,
          currentValue: 3,
          unit: "deals",
          progress: 60,
          status: "in_progress",
          updatedAt: now.toISOString(),
        },
        {
          id: "kr_1_2",
          title: "Upsell existing accounts by $150K",
          targetValue: 150000,
          currentValue: 89000,
          unit: "dollars",
          progress: 59,
          status: "in_progress",
          updatedAt: now.toISOString(),
        },
        {
          id: "kr_1_3",
          title: "Maintain 90% retention rate",
          targetValue: 90,
          currentValue: 92,
          unit: "percent",
          progress: 100,
          status: "completed",
          updatedAt: now.toISOString(),
        },
      ],
      progress: 73,
      xpReward: 230,
      createdAt: new Date(now.getFullYear(), 9, 1).toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: "goal_2",
      title: "Run a Half Marathon",
      description: "Train for and complete a half marathon (13.1 miles)",
      category: "health",
      timeframe: "quarterly",
      status: "in_progress",
      startDate: new Date(now.getFullYear(), 9, 1).toISOString(),
      endDate: new Date(now.getFullYear(), 11, 15).toISOString(),
      keyResults: [
        {
          id: "kr_2_1",
          title: "Run 100 miles total",
          targetValue: 100,
          currentValue: 67,
          unit: "miles",
          progress: 67,
          status: "in_progress",
          updatedAt: now.toISOString(),
        },
        {
          id: "kr_2_2",
          title: "Complete 3 long runs (10+ miles)",
          targetValue: 3,
          currentValue: 2,
          unit: "runs",
          progress: 67,
          status: "in_progress",
          updatedAt: now.toISOString(),
        },
      ],
      progress: 67,
      xpReward: 220,
      createdAt: new Date(now.getFullYear(), 9, 1).toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: "goal_3",
      title: "Read 12 Books This Year",
      description: "Expand knowledge through consistent reading habit",
      category: "learning",
      timeframe: "yearly",
      status: "in_progress",
      startDate: new Date(now.getFullYear(), 0, 1).toISOString(),
      endDate: new Date(now.getFullYear(), 11, 31).toISOString(),
      keyResults: [
        {
          id: "kr_3_1",
          title: "Complete 12 books",
          targetValue: 12,
          currentValue: 9,
          unit: "books",
          progress: 75,
          status: "in_progress",
          updatedAt: now.toISOString(),
        },
        {
          id: "kr_3_2",
          title: "Write 12 book summaries",
          targetValue: 12,
          currentValue: 7,
          unit: "summaries",
          progress: 58,
          status: "in_progress",
          updatedAt: now.toISOString(),
        },
      ],
      progress: 67,
      xpReward: 520,
      createdAt: new Date(now.getFullYear(), 0, 1).toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: "goal_4",
      title: "Build Emergency Fund",
      description: "Save 3 months of expenses in emergency fund",
      category: "finance",
      timeframe: "yearly",
      status: "at_risk",
      startDate: new Date(now.getFullYear(), 0, 1).toISOString(),
      endDate: new Date(now.getFullYear(), 11, 31).toISOString(),
      keyResults: [
        {
          id: "kr_4_1",
          title: "Save $15,000",
          targetValue: 15000,
          currentValue: 8500,
          unit: "dollars",
          progress: 57,
          status: "at_risk",
          updatedAt: now.toISOString(),
        },
      ],
      progress: 57,
      xpReward: 510,
      createdAt: new Date(now.getFullYear(), 0, 1).toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: "goal_5",
      title: "Weekly Date Night",
      description: "Strengthen relationship with consistent quality time",
      category: "relationships",
      timeframe: "monthly",
      status: "completed",
      startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
      keyResults: [
        {
          id: "kr_5_1",
          title: "Complete 4 date nights",
          targetValue: 4,
          currentValue: 4,
          unit: "dates",
          progress: 100,
          status: "completed",
          updatedAt: now.toISOString(),
        },
      ],
      progress: 100,
      xpReward: 110,
      createdAt: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: "goal_6",
      title: "Learn Spanish Basics",
      description: "Complete A1 level Spanish course",
      category: "learning",
      timeframe: "quarterly",
      status: "not_started",
      startDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
      endDate: new Date(now.getFullYear(), now.getMonth() + 4, 0).toISOString(),
      keyResults: [
        {
          id: "kr_6_1",
          title: "Complete 30 Duolingo lessons",
          targetValue: 30,
          currentValue: 0,
          unit: "lessons",
          progress: 0,
          status: "not_started",
          updatedAt: now.toISOString(),
        },
        {
          id: "kr_6_2",
          title: "Learn 500 vocabulary words",
          targetValue: 500,
          currentValue: 0,
          unit: "words",
          progress: 0,
          status: "not_started",
          updatedAt: now.toISOString(),
        },
      ],
      progress: 0,
      xpReward: 220,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];

  return goals;
}

function calculateStats(goals: Goal[]): GoalStats {
  const stats: GoalStats = {
    total: goals.length,
    completed: 0,
    inProgress: 0,
    atRisk: 0,
    notStarted: 0,
    abandoned: 0,
    avgProgress: 0,
    xpEarned: 0,
  };

  let totalProgress = 0;

  for (const goal of goals) {
    totalProgress += goal.progress;

    switch (goal.status) {
      case "completed":
        stats.completed++;
        stats.xpEarned += goal.xpReward;
        break;
      case "in_progress":
        stats.inProgress++;
        break;
      case "at_risk":
        stats.atRisk++;
        break;
      case "not_started":
        stats.notStarted++;
        break;
      case "abandoned":
        stats.abandoned++;
        break;
    }
  }

  stats.avgProgress = goals.length > 0 ? Math.round(totalProgress / goals.length) : 0;

  return stats;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as GoalCategory | null;
    const status = searchParams.get("status") as GoalStatus | null;
    const timeframe = searchParams.get("timeframe") as GoalTimeframe | null;

    let goals = generateMockGoals();

    // Apply filters
    if (category) {
      goals = goals.filter((g) => g.category === category);
    }
    if (status) {
      goals = goals.filter((g) => g.status === status);
    }
    if (timeframe) {
      goals = goals.filter((g) => g.timeframe === timeframe);
    }

    const stats = calculateStats(goals);

    return NextResponse.json({
      goals,
      stats,
      filters: { category, status, timeframe },
    });
  } catch (error) {
    console.error("Goals API error:", error);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "create") {
      const { title, description, category, timeframe, endDate, keyResults } = body;

      const newGoal: Goal = {
        id: `goal_${Date.now()}`,
        title,
        description,
        category,
        timeframe,
        status: "not_started",
        startDate: new Date().toISOString(),
        endDate,
        keyResults: keyResults.map((kr: any, idx: number) => ({
          id: `kr_${Date.now()}_${idx}`,
          title: kr.title,
          targetValue: kr.targetValue,
          currentValue: 0,
          unit: kr.unit,
          progress: 0,
          status: "not_started" as GoalStatus,
          updatedAt: new Date().toISOString(),
        })),
        progress: 0,
        xpReward: getGoalXpReward(timeframe, keyResults.length),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return NextResponse.json({ goal: newGoal, message: "Goal created" });
    }

    if (action === "update_key_result") {
      const { goalId, keyResultId, currentValue } = body;

      // In production, update in database
      // For now, return success
      return NextResponse.json({
        message: "Key result updated",
        goalId,
        keyResultId,
        currentValue,
      });
    }

    if (action === "complete") {
      const { goalId } = body;

      // Award XP when goal is completed
      try {
        await fetch(new URL("/api/xp/log", request.url).toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activity: "Goal Completed",
            xp: 100, // Base XP, would be goal.xpReward in production
            category: "IXP",
            source: "goals",
          }),
        });
      } catch (err) {
        console.error("Failed to award XP:", err);
      }

      return NextResponse.json({ message: "Goal completed", goalId });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Goals API error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
