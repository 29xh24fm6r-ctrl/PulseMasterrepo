import { NextRequest, NextResponse } from 'next/server';

export interface WeeklyReviewData {
  period: {
    start: string;
    end: string;
    weekNumber: number;
  };
  xp: {
    total: number;
    byCategory: Record<string, number>;
    dailyBreakdown: { date: string; amount: number }[];
    critCount: number;
    identityBonuses: number;
    trend: 'up' | 'down' | 'stable';
    vsLastWeek: number;
  };
  tasks: {
    completed: number;
    created: number;
    completionRate: number;
    byPriority: { high: number; medium: number; low: number };
  };
  habits: {
    totalCompletions: number;
    streaks: { name: string; streak: number; icon: string }[];
    completionRate: number;
    perfectDays: number;
  };
  identity: {
    actionsTracked: number;
    resonanceGained: Record<string, number>;
    topArchetype: { id: string; name: string; icon: string; gained: number } | null;
    valuesReinforced: string[];
    streakDays: number;
  };
  highlights: {
    type: 'achievement' | 'milestone' | 'streak' | 'improvement';
    title: string;
    description: string;
    icon: string;
  }[];
  insights: string[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekOffset = parseInt(searchParams.get('weekOffset') || '0');

    // Calculate week boundaries
    const now = new Date();
    const currentDay = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - currentDay - (weekOffset * 7));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Get week number
    const startOfYear = new Date(weekStart.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((weekStart.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

    // Generate review data (mock for now, would pull from Notion/localStorage)
    const reviewData = generateMockReviewData(weekStart, weekEnd, weekNumber);

    return NextResponse.json({
      ok: true,
      review: reviewData,
    });

  } catch (error: unknown) {
    console.error('Weekly review error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function generateMockReviewData(weekStart: Date, weekEnd: Date, weekNumber: number): WeeklyReviewData {
  // Generate daily XP breakdown
  const dailyBreakdown: { date: string; amount: number }[] = [];
  const currentDate = new Date(weekStart);
  let totalXP = 0;
  
  while (currentDate <= weekEnd && currentDate <= new Date()) {
    const dayXP = 150 + Math.floor(Math.random() * 200);
    dailyBreakdown.push({
      date: currentDate.toISOString(),
      amount: dayXP,
    });
    totalXP += dayXP;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const completedTasks = 12 + Math.floor(Math.random() * 10);
  const createdTasks = completedTasks + Math.floor(Math.random() * 5);
  
  const habitCompletions = 15 + Math.floor(Math.random() * 10);
  const perfectDays = Math.floor(Math.random() * 4);

  const identityActions = 5 + Math.floor(Math.random() * 8);

  // Generate highlights
  const highlights: WeeklyReviewData['highlights'] = [];
  
  if (totalXP > 1500) {
    highlights.push({
      type: 'achievement',
      title: 'XP Crusher',
      description: `Earned ${totalXP} XP this week!`,
      icon: '⚡',
    });
  }
  
  if (perfectDays >= 3) {
    highlights.push({
      type: 'streak',
      title: 'Perfect Streak',
      description: `${perfectDays} days with all habits completed`,
      icon: '🔥',
    });
  }

  if (completedTasks >= 15) {
    highlights.push({
      type: 'milestone',
      title: 'Task Master',
      description: `Completed ${completedTasks} tasks`,
      icon: '✅',
    });
  }

  if (identityActions >= 7) {
    highlights.push({
      type: 'improvement',
      title: 'Identity Builder',
      description: `${identityActions} identity actions tracked`,
      icon: '🔮',
    });
  }

  // Generate insights
  const insights: string[] = [];
  
  if (dailyBreakdown.length > 0) {
    const avgXP = Math.round(totalXP / dailyBreakdown.length);
    insights.push(`Your average daily XP was ${avgXP}. ${avgXP > 250 ? 'Excellent momentum!' : 'Room to grow!'}`);
  }

  const completionRate = Math.round((completedTasks / createdTasks) * 100);
  if (completionRate >= 80) {
    insights.push(`Task completion rate of ${completionRate}% shows strong execution.`);
  } else {
    insights.push(`Task completion was ${completionRate}%. Consider fewer, higher-impact tasks.`);
  }

  if (identityActions < 5) {
    insights.push('Try tracking more identity actions to build resonance faster.');
  }

  return {
    period: {
      start: weekStart.toISOString(),
      end: weekEnd.toISOString(),
      weekNumber,
    },
    xp: {
      total: totalXP,
      byCategory: {
        DXP: Math.floor(totalXP * 0.35),
        PXP: Math.floor(totalXP * 0.15),
        IXP: Math.floor(totalXP * 0.20),
        AXP: Math.floor(totalXP * 0.10),
        MXP: Math.floor(totalXP * 0.20),
      },
      dailyBreakdown,
      critCount: Math.floor(Math.random() * 5),
      identityBonuses: Math.floor(Math.random() * 8),
      trend: totalXP > 1200 ? 'up' : totalXP < 800 ? 'down' : 'stable',
      vsLastWeek: Math.floor(Math.random() * 40) - 20,
    },
    tasks: {
      completed: completedTasks,
      created: createdTasks,
      completionRate,
      byPriority: {
        high: Math.floor(completedTasks * 0.3),
        medium: Math.floor(completedTasks * 0.5),
        low: Math.floor(completedTasks * 0.2),
      },
    },
    habits: {
      totalCompletions: habitCompletions,
      streaks: [
        { name: 'Morning Routine', streak: 7 + Math.floor(Math.random() * 10), icon: '🌅' },
        { name: 'Exercise', streak: 3 + Math.floor(Math.random() * 5), icon: '💪' },
        { name: 'Reading', streak: 5 + Math.floor(Math.random() * 8), icon: '📚' },
      ],
      completionRate: Math.round((habitCompletions / 21) * 100),
      perfectDays,
    },
    identity: {
      actionsTracked: identityActions,
      resonanceGained: {
        stoic: 20 + Math.floor(Math.random() * 30),
        warrior: 15 + Math.floor(Math.random() * 25),
        builder: 10 + Math.floor(Math.random() * 20),
      },
      topArchetype: {
        id: 'stoic',
        name: 'Stoic',
        icon: '🏛️',
        gained: 35 + Math.floor(Math.random() * 20),
      },
      valuesReinforced: ['discipline', 'growth', 'integrity'],
      streakDays: Math.floor(Math.random() * 7),
    },
    highlights,
    insights,
  };
}
