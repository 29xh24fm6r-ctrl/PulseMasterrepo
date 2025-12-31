// Pulse OS - Proactive Scan API
// app/api/pulse/proactive/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  filterInsightsByAutonomy,
  getAutonomyStatus,
  type AutonomySettings
} from '@/lib/autonomy-behavior';

import { getTasks } from '@/lib/data/tasks';
import { getHabits } from '@/lib/data/habits';
import { getDeals } from '@/lib/data/deals';
import { getContacts } from '@/lib/data/journal';

type Insight = {
  type: string;
  priority: "high" | "medium" | "low";
  icon: string;
  title: string;
  message: string;
  action?: { label: string; type: string; payload?: Record<string, any> };
  data?: Record<string, any>;
};

// GET - backward compatible (no autonomy filtering)
export async function GET() {
  return runProactiveScan(null, null);
}

// POST - with autonomy settings
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const settings: AutonomySettings | null = body.settings || null;
    return runProactiveScan(settings, userId);
  } catch {
    return runProactiveScan(null, null);
  }
}

async function runProactiveScan(settings: AutonomySettings | null, userId: string | null) {
  try {
    if (!userId) {
      // Ideally we shouldn't fail hard for backward compat if strict auth wasn't enforced before,
      // but new data layer REQUIRES userId. 
      // If GET is called without auth context (e.g. cron?), we might need a service role or fail.
      // Assuming client context for now.
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    console.log('[Proactive] Running scan...');

    const autonomyStatus = getAutonomyStatus(settings);
    console.log(`[Proactive] Autonomy: ${autonomyStatus.summary}`);

    if (autonomyStatus.level === "zen") {
      return NextResponse.json({
        success: true,
        count: 0,
        insights: [],
        filtered: 0,
        autonomy: autonomyStatus,
        scannedAt: new Date().toISOString(),
        message: "Zen mode active - no insights shown",
      });
    }

    const insights: Insight[] = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const [overdueTasks, streakRisks, coldRelationships, staleDeals, celebrations] =
      await Promise.all([
        scanOverdueTasks(userId, todayStr),
        scanStreakRisks(userId, today, todayStr),
        scanColdRelationships(userId, today),
        scanStaleDeals(userId, today),
        scanCelebrations(userId, todayStr),
      ]);

    insights.push(...overdueTasks, ...streakRisks, ...coldRelationships, ...staleDeals, ...celebrations);

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const { insights: filteredInsights, filtered, reason } = filterInsightsByAutonomy(insights, settings);

    console.log(`[Proactive] Found ${insights.length}, showing ${filteredInsights.length} (filtered ${filtered})`);

    return NextResponse.json({
      success: true,
      count: filteredInsights.length,
      insights: filteredInsights,
      filtered,
      filterReason: reason,
      autonomy: autonomyStatus,
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Proactive] Error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

async function scanOverdueTasks(userId: string, todayStr: string): Promise<Insight[]> {
  try {
    const allTasks = await getTasks(userId);
    const overdueTasks = allTasks.filter(t => t.status !== 'done' && t.due_at && t.due_at < todayStr);

    const tasks = overdueTasks.map(t => ({
      name: t.title,
      dueDate: t.due_at,
      priority: t.priority, // Assuming priority is capitalized 'High', 'Medium' etc
    }));

    if (tasks.length === 0) return [];

    const highPriority = tasks.filter(t => t.priority === 'High');

    if (tasks.length >= 5) {
      return [{
        type: 'overdue_tasks', priority: 'high', icon: '⚠️',
        title: `${tasks.length} tasks overdue`,
        message: `You've got ${tasks.length} overdue tasks piling up.`,
        action: { label: 'Show tasks', type: 'navigate', payload: { page: 'tasks' } },
        data: { count: tasks.length, tasks: tasks.slice(0, 5) }
      }];
    } else if (highPriority.length > 0) {
      return [{
        type: 'overdue_tasks', priority: 'high', icon: '🔴',
        title: `High priority overdue`,
        message: `"${highPriority[0].name}" is overdue and high priority.`,
        action: { label: 'View tasks', type: 'navigate', payload: { page: 'tasks' } },
        data: { task: highPriority[0] }
      }];
    } else if (tasks.length > 0) {
      return [{
        type: 'overdue_tasks', priority: 'medium', icon: '📋',
        title: `${tasks.length} task${tasks.length > 1 ? 's' : ''} overdue`,
        message: tasks.length === 1 ? `"${tasks[0].name}" is past due.` : `${tasks.length} tasks need attention.`,
        action: { label: 'Show tasks', type: 'navigate', payload: { page: 'tasks' } },
        data: { count: tasks.length }
      }];
    }
    return [];
  } catch (error) {
    console.error('[Scan:Overdue]', error);
    return [];
  }
}

async function scanStreakRisks(userId: string, today: Date, todayStr: string): Promise<Insight[]> {
  const hour = today.getHours();
  if (hour < 18) return [];

  try {
    const habits = await getHabits(userId);
    const insights: Insight[] = [];

    for (const habit of habits) {
      const lastCompleted = habit.last_completed_at ? habit.last_completed_at.split('T')[0] : null;

      if (lastCompleted === todayStr) continue;

      const streak = habit.streak || 0;
      if (streak >= 3) {
        insights.push({
          type: 'streak_risk',
          priority: streak >= 7 ? 'high' : 'medium',
          icon: '🔥',
          title: `${streak}-day ${habit.name} streak at risk!`,
          message: streak >= 7 ? `Don't let your ${streak}-day streak slip!` : `Your ${habit.name} streak is on the line.`,
          action: { label: `Log ${habit.name}`, type: 'log_habit', payload: { habit_name: habit.name } },
          data: { habit: habit.name, streak }
        });
      }
    }
    return insights.slice(0, 2);
  } catch (error) {
    console.error('[Scan:Streaks]', error);
    return [];
  }
}

async function scanColdRelationships(userId: string, today: Date): Promise<Insight[]> {
  try {
    const contacts = await getContacts(userId);

    const candidates = contacts
      .map(c => {
        // Mocking 'lastContact' logic as basic schema might not track it deeply yet
        // If schema has last_contact_at, use it. Otherwise use last_interaction if exists
        // Fallback: created_at if nothing else (imperfect)
        // For now, let's assume 'updated_at' is a proxy for activity if focused on CRM? 
        // Or if we don't have it, valid to skip or just show random 'reconnect' for older contacts.
        // Let's rely on `last_interaction` if we added it, checking journal.ts type...
        // Journal.ts Contact type: id, user_id, name, email, phone, company, role, tags, created_at
        // It doesn't strictly have last_interaction. We will skip this feature gracefully or mock logic.

        // Actually, let's skip scanning for now if we can't do it reliably without 'last_interaction' column.
        return null;
      })
      .filter(Boolean) as any[]; // Empty for now until schema update

    // Mock return to keep feature alive if needed, or return []
    return [];
  } catch (error) {
    console.error('[Scan:Relationships]', error);
    return [];
  }
}

async function scanStaleDeals(userId: string, today: Date): Promise<Insight[]> {
  try {
    const deals = await getDeals(userId);

    const activeDeals = deals.filter(d => !['Closed Won', 'Closed Lost'].includes(d.stage));

    const staleList = activeDeals
      .map(d => {
        const lastActivity = d.updated_at || d.created_at;
        const daysSince = lastActivity
          ? Math.floor((today.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        return {
          name: d.title,
          company: d.company,
          stage: d.stage,
          value: d.value,
          daysSince,
        };
      })
      .filter(d => d.daysSince >= 10)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    if (staleList.length === 0) return [];
    const top = staleList[0];
    return [{
      type: 'stale_deal',
      priority: top.value && top.value >= 50000 ? 'high' : 'medium',
      icon: '💰',
      title: `${top.name} needs attention`,
      message: top.value
        ? `$${top.value.toLocaleString()} deal hasn't moved in ${top.daysSince} days.`
        : `Deal quiet for ${top.daysSince} days.`,
      action: { label: 'View deals', type: 'navigate', payload: { page: 'deals' } },
      data: { deal: top, totalStale: staleList.length }
    }];
  } catch (error) {
    console.error('[Scan:Deals]', error);
    return [];
  }
}

async function scanCelebrations(userId: string, todayStr: string): Promise<Insight[]> {
  const insights: Insight[] = [];

  try {
    const habits = await getHabits(userId);
    for (const h of habits) {
      if (h.last_completed_at?.startsWith(todayStr)) {
        const streak = h.streak || 0;
        const milestones = [7, 14, 21, 30, 50, 100];
        if (milestones.includes(streak)) {
          insights.push({
            type: 'celebration', priority: 'low', icon: '🎉',
            title: `${streak}-day ${h.name} streak!`,
            message: streak >= 30 ? `Incredible! You're building something real.` : `${streak} days strong!`,
            data: { habit: h.name, streak }
          });
        }
      }
    }
  } catch (error) { console.error('[Scan:Celebrations]', error); }

  try {
    const tasks = await getTasks(userId);
    const completedToday = tasks.filter(t => t.status === 'done' && t.completed_at?.startsWith(todayStr)).length;

    if (completedToday >= 5) {
      insights.push({
        type: 'momentum', priority: 'low', icon: '🔥',
        title: `On fire today!`,
        message: `${completedToday} tasks crushed. You're in the zone!`,
        data: { completedToday }
      });
    }
  } catch (error) { console.error('[Scan:Momentum]', error); }

  return insights;
}
