// Pulse OS - Proactive Scan API
// app/api/pulse/proactive/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { 
  filterInsightsByAutonomy, 
  getAutonomyStatus,
  type AutonomySettings 
} from '@/lib/autonomy-behavior';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const TASKS_DB = process.env.NOTION_DATABASE_TASKS;
const HABITS_DB = process.env.NOTION_DATABASE_HABITS;
const DEALS_DB = process.env.NOTION_DATABASE_DEALS;
const SECOND_BRAIN_DB = process.env.NOTION_DATABASE_SECOND_BRAIN;

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
  return runProactiveScan(null);
}

// POST - with autonomy settings
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const settings: AutonomySettings | null = body.settings || null;
    return runProactiveScan(settings);
  } catch {
    return runProactiveScan(null);
  }
}

async function runProactiveScan(settings: AutonomySettings | null) {
  try {
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
        scanOverdueTasks(todayStr),
        scanStreakRisks(today, todayStr),
        scanColdRelationships(today),
        scanStaleDeals(today),
        scanCelebrations(todayStr),
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

async function scanOverdueTasks(todayStr: string): Promise<Insight[]> {
  if (!TASKS_DB) return [];
  try {
    const response = await notion.databases.query({
      database_id: TASKS_DB,
      filter: { property: 'Due Date', date: { before: todayStr } },
    });
    
    const overdueTasks = response.results.filter((page: any) => {
      const status = page.properties.Status?.status?.name || page.properties.Status?.select?.name || '';
      return status !== 'Done';
    });
    
    const tasks = overdueTasks.map((page: any) => ({
      name: page.properties.Name?.title?.[0]?.text?.content || 'Untitled',
      dueDate: page.properties['Due Date']?.date?.start,
      priority: page.properties.Priority?.select?.name || 'Medium',
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

async function scanStreakRisks(today: Date, todayStr: string): Promise<Insight[]> {
  if (!HABITS_DB) return [];
  const hour = today.getHours();
  if (hour < 18) return [];
  
  try {
    const response = await notion.databases.query({ database_id: HABITS_DB });
    const insights: Insight[] = [];
    
    for (const page of response.results as any[]) {
      const name = page.properties.Name?.title?.[0]?.text?.content;
      const streak = page.properties.Streak?.number || 0;
      const lastCompleted = page.properties['Last Completed']?.date?.start;
      
      if (lastCompleted === todayStr) continue;
      if (streak >= 3) {
        insights.push({
          type: 'streak_risk',
          priority: streak >= 7 ? 'high' : 'medium',
          icon: '🔥',
          title: `${streak}-day ${name} streak at risk!`,
          message: streak >= 7 ? `Don't let your ${streak}-day streak slip!` : `Your ${name} streak is on the line.`,
          action: { label: `Log ${name}`, type: 'log_habit', payload: { habit_name: name } },
          data: { habit: name, streak }
        });
      }
    }
    return insights.slice(0, 2);
  } catch (error) {
    console.error('[Scan:Streaks]', error);
    return [];
  }
}

async function scanColdRelationships(today: Date): Promise<Insight[]> {
  if (!SECOND_BRAIN_DB) return [];
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().split('T')[0];
  
  try {
    let response;
    try {
      response = await notion.databases.query({
        database_id: SECOND_BRAIN_DB,
        filter: { property: 'Last Contact', date: { before: twoWeeksAgoStr } },
        page_size: 10,
      });
    } catch { return []; }
    
    const contacts = response.results
      .map((page: any) => {
        const lastContact = page.properties['Last Contact']?.date?.start;
        const daysSince = lastContact 
          ? Math.floor((today.getTime() - new Date(lastContact).getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        return {
          name: page.properties.Name?.title?.[0]?.text?.content || 'Unknown',
          company: page.properties.Company?.rich_text?.[0]?.text?.content,
          daysSince,
        };
      })
      .filter(c => c.daysSince >= 14)
      .sort((a, b) => b.daysSince - a.daysSince);
    
    if (contacts.length === 0) return [];
    const top = contacts[0];
    return [{
      type: 'cold_relationship',
      priority: top.daysSince >= 30 ? 'high' : 'medium',
      icon: '👤',
      title: `Reconnect with ${top.name}`,
      message: `It's been ${top.daysSince} days since you talked to ${top.name}.`,
      action: { label: 'Create follow-up', type: 'create_follow_up', payload: { person: top.name, reason: 'Reconnect' } },
      data: { contact: top, totalCold: contacts.length }
    }];
  } catch (error) {
    console.error('[Scan:Relationships]', error);
    return [];
  }
}

async function scanStaleDeals(today: Date): Promise<Insight[]> {
  if (!DEALS_DB) return [];
  try {
    const response = await notion.databases.query({ database_id: DEALS_DB });
    
    const activeDeals = response.results.filter((page: any) => {
      const stage = page.properties.Stage?.select?.name || page.properties.Stage?.status?.name || '';
      return stage !== 'Closed Won' && stage !== 'Closed Lost';
    });
    
    const deals = activeDeals
      .map((page: any) => {
        const lastActivity = page.properties['Last Activity']?.date?.start || page.last_edited_time;
        const daysSince = lastActivity
          ? Math.floor((today.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        return {
          name: page.properties.Name?.title?.[0]?.text?.content || 'Untitled',
          company: page.properties.Company?.rich_text?.[0]?.text?.content,
          stage: page.properties.Stage?.select?.name || page.properties.Stage?.status?.name,
          value: page.properties.Value?.number,
          daysSince,
        };
      })
      .filter(d => d.daysSince >= 10)
      .sort((a, b) => (b.value || 0) - (a.value || 0));
    
    if (deals.length === 0) return [];
    const top = deals[0];
    return [{
      type: 'stale_deal',
      priority: top.value && top.value >= 50000 ? 'high' : 'medium',
      icon: '💰',
      title: `${top.name} needs attention`,
      message: top.value
        ? `$${top.value.toLocaleString()} deal hasn't moved in ${top.daysSince} days.`
        : `Deal quiet for ${top.daysSince} days.`,
      action: { label: 'View deals', type: 'navigate', payload: { page: 'deals' } },
      data: { deal: top, totalStale: deals.length }
    }];
  } catch (error) {
    console.error('[Scan:Deals]', error);
    return [];
  }
}

async function scanCelebrations(todayStr: string): Promise<Insight[]> {
  const insights: Insight[] = [];
  
  if (HABITS_DB) {
    try {
      const habits = await notion.databases.query({ database_id: HABITS_DB });
      for (const page of habits.results as any[]) {
        const name = page.properties.Name?.title?.[0]?.text?.content;
        const streak = page.properties.Streak?.number || 0;
        const lastCompleted = page.properties['Last Completed']?.date?.start;
        const milestones = [7, 14, 21, 30, 50, 100];
        if (lastCompleted === todayStr && milestones.includes(streak)) {
          insights.push({
            type: 'celebration', priority: 'low', icon: '🎉',
            title: `${streak}-day ${name} streak!`,
            message: streak >= 30 ? `Incredible! You're building something real.` : `${streak} days strong!`,
            data: { habit: name, streak }
          });
        }
      }
    } catch (error) { console.error('[Scan:Celebrations]', error); }
  }
  
  if (TASKS_DB) {
    try {
      const tasks = await notion.databases.query({ database_id: TASKS_DB, page_size: 50 });
      const completedToday = tasks.results.filter((page: any) => {
        const status = page.properties.Status?.status?.name || page.properties.Status?.select?.name || '';
        const edited = page.last_edited_time;
        return status === 'Done' && edited?.startsWith(todayStr);
      }).length;
      if (completedToday >= 5) {
        insights.push({
          type: 'momentum', priority: 'low', icon: '🔥',
          title: `On fire today!`,
          message: `${completedToday} tasks crushed. You're in the zone!`,
          data: { completedToday }
        });
      }
    } catch (error) { console.error('[Scan:Momentum]', error); }
  }
  
  return insights;
}
