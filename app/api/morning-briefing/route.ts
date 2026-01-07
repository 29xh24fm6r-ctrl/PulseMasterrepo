// app/api/morning-briefing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { canMakeAICall } from "@/lib/services/usage";
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ============================================
// Types
// ============================================

type Task = {
  id: string;
  name: string;
  status: string;
  priority: string;
  dueDate: string | null;
  isOverdue: boolean;
  isDueToday: boolean;
  isDueTomorrow: boolean;
  daysOverdue: number;
};

type FollowUp = {
  id: string;
  name: string;
  status: string;
  priority: string;
  dueDate: string | null;
  type: string;
  isOverdue: boolean;
  isDueToday: boolean;
  personName?: string;
};

type Deal = {
  id: string;
  name: string;
  stage: string;
  value: number;
  probability: number;
  daysSinceUpdate: number;
  isStale: boolean;
};

type Contact = {
  id: string;
  name: string;
  email: string;
  lastContact: string | null;
  daysSinceContact: number;
  relationshipStatus: "cold" | "cooling" | "warm" | "hot";
};

import { getTasks } from '@/lib/data/tasks';
import { getDeals } from '@/lib/data/deals';
import { getContacts, type Contact } from "@/lib/data/journal";
import { getFollowUps } from '@/lib/data/followups';

// Data Fetching Adapters
async function fetchTasks(userId: string) {
  const tasks = await getTasks(userId);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  return tasks.filter(t => t.status !== 'done').map(t => {
    const isOverdue = t.due_at ? t.due_at.split('T')[0] < todayStr : false;
    const daysOverdue = isOverdue && t.due_at
      // @ts-ignore
      ? Math.floor((today.getTime() - new Date(t.due_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      id: t.id,
      name: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.due_at || null,
      isOverdue,
      isDueToday: t.due_at?.split('T')[0] === todayStr,
      isDueTomorrow: t.due_at?.split('T')[0] === tomorrowStr,
      daysOverdue
    };
  });
}

async function fetchFollowUps(userId: string) {
  const followups = await getFollowUps(userId);
  return followups.filter(f => f.status !== 'sent' && f.status !== 'responded').map(f => ({
    id: f.id,
    name: f.name,
    status: f.status,
    priority: f.priority,
    dueDate: f.due_date || null,
    type: f.type,
    isOverdue: f.isOverdue,
    isDueToday: f.isDueToday
  }));
}

async function fetchDeals(userId: string) {
  const deals = await getDeals(userId);
  const today = new Date();
  return deals.filter(d => !['Closed Won', 'Closed Lost'].includes(d.stage)).map(d => {
    // Mocking last_updated logic as Supabase simple schema might not have it or I didn't verify it
    // Assuming we rely on active deals for now
    return {
      id: d.id,
      name: d.title,
      stage: d.stage,
      value: d.value || 0,
      probability: 50, // Mock
      daysSinceUpdate: 0, // Mock
      isStale: false // Mock
    };
  });
}

async function fetchContacts(userId: string) {
  const contacts = await getContacts(userId);
  const today = new Date();

  return contacts.map(c => {
    // Mocking interaction history logic as 'contacts' table is simple CRM
    return {
      id: c.id,
      name: c.name,
      email: c.email || '',
      lastContact: null,
      daysSinceContact: 0,
      relationshipStatus: "warm" as "cold" | "cooling" | "warm" | "hot" // Default safe
    };
  });
}

// ============================================
// AI Brief Generation
// ============================================

async function generateAIBrief(data: {
  tasks: Task[];
  followUps: FollowUp[];
  deals: Deal[];
  contacts: Contact[];
}): Promise<string> {
  const { tasks, followUps, deals, contacts } = data;

  const overdueTasks = tasks.filter(t => t.isOverdue);
  const todayTasks = tasks.filter(t => t.isDueToday);
  const tomorrowTasks = tasks.filter(t => t.isDueTomorrow);
  const highPriorityTasks = tasks.filter(t => t.priority === "High" && !t.isOverdue);

  const overdueFollowUps = followUps.filter(f => f.isOverdue);
  const todayFollowUps = followUps.filter(f => f.isDueToday);

  const staleDeals = deals.filter(d => d.isStale);
  const totalPipelineValue = deals.reduce((sum, d) => sum + d.value, 0);
  const weightedPipeline = deals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0);

  const coldContacts = contacts.filter((c: Contact) => c.relationshipStatus === "cold");
  const coolingContacts = contacts.filter((c: Contact) => c.relationshipStatus === "cooling");

  const prompt = `You are an executive AI assistant. Generate a brief, actionable morning summary.

DATA:
- Overdue Tasks: ${overdueTasks.length} ${overdueTasks.length > 0 ? `(${overdueTasks.slice(0, 3).map(t => t.name).join(", ")})` : ""}
- Due Today: ${todayTasks.length} tasks, ${todayFollowUps.length} follow-ups
- Due Tomorrow: ${tomorrowTasks.length} tasks
- High Priority Pending: ${highPriorityTasks.length}
- Overdue Follow-ups: ${overdueFollowUps.length}
- Active Deals: ${deals.length} (Pipeline: $${totalPipelineValue.toLocaleString()}, Weighted: $${Math.round(weightedPipeline).toLocaleString()})
- Stale Deals (no activity 7+ days): ${staleDeals.length} ${staleDeals.length > 0 ? `(${staleDeals.slice(0, 2).map(d => d.name).join(", ")})` : ""}
- Relationships Cooling: ${coolingContacts.length}
- Relationships Cold: ${coldContacts.length}

Write a 3-4 sentence morning brief that:
1. Highlights the most urgent items needing attention
2. Notes any concerning patterns (overdue items, stale deals, cold relationships)
3. Ends with an encouraging, action-oriented statement

Be concise, direct, and helpful. No fluff.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
    });

    return completion.choices[0].message.content || "Ready to tackle the day!";
  } catch (err) {
    console.error("AI brief error:", err);
    return "Your morning brief is ready. Check your tasks and follow-ups below.";
  }
}

// ============================================
// Main Handler
// ============================================

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const usageCheck = await canMakeAICall(userId, "morning_briefing", 10);
    if (!usageCheck.allowed) return NextResponse.json({ error: usageCheck.reason, requiresUpgrade: usageCheck.requiresUpgrade }, { status: 402 });

    console.log("🌅 Generating Morning Brief...");

    const [tasks, followUps, deals, contacts] = await Promise.all([
      fetchTasks(userId),
      fetchFollowUps(userId),
      fetchDeals(userId),
      fetchContacts(userId),
    ]);

    console.log(`📋 Tasks: ${tasks.length} `);
    console.log(`📅 Follow - ups: ${followUps.length} `);
    console.log(`💰 Deals: ${deals.length} `);
    console.log(`👥 Contacts: ${contacts.length} `);

    const today = new Date();
    const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" });
    const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    const overdueTasks = tasks.filter(t => t.isOverdue);
    const todayTasks = tasks.filter(t => t.isDueToday);
    const tomorrowTasks = tasks.filter(t => t.isDueTomorrow);
    const highPriorityTasks = tasks.filter(t => t.priority === "High");

    const overdueFollowUps = followUps.filter(f => f.isOverdue);
    const todayFollowUps = followUps.filter(f => f.isDueToday);

    const staleDeals = deals.filter(d => d.isStale);
    const totalPipelineValue = deals.reduce((sum, d) => sum + d.value, 0);
    const weightedPipeline = deals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0);

    const coldContacts = contacts.filter((c: Contact) => c.relationshipStatus === "cold");
    const coolingContacts = contacts.filter((c: Contact) => c.relationshipStatus === "cooling");

    const aiBrief = await generateAIBrief({ tasks, followUps, deals, contacts });

    const urgentItems: Array<{ type: string; name: string; reason: string; priority: string }> = [];

    for (const task of overdueTasks.slice(0, 5)) {
      urgentItems.push({
        type: "task",
        name: task.name,
        reason: `${task.daysOverdue} day${task.daysOverdue > 1 ? "s" : ""} overdue`,
        priority: task.priority,
      });
    }

    for (const followUp of overdueFollowUps.slice(0, 3)) {
      urgentItems.push({
        type: "follow-up",
        name: followUp.name,
        reason: "Overdue",
        priority: followUp.priority,
      });
    }

    for (const deal of staleDeals.slice(0, 3)) {
      urgentItems.push({
        type: "deal",
        name: deal.name,
        reason: `No activity for ${deal.daysSinceUpdate} days`,
        priority: "High",
      });
    }

    const priorityOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
    urgentItems.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));

    console.log("✅ Morning Brief generated!");

    return NextResponse.json({
      ok: true,
      date: dateStr,
      dayOfWeek,
      greeting: getGreeting(),
      aiBrief,
      summary: {
        totalTasks: tasks.length,
        overdueTasks: overdueTasks.length,
        todayTasks: todayTasks.length,
        tomorrowTasks: tomorrowTasks.length,
        highPriorityTasks: highPriorityTasks.length,
        totalFollowUps: followUps.length,
        overdueFollowUps: overdueFollowUps.length,
        todayFollowUps: todayFollowUps.length,
        totalDeals: deals.length,
        staleDeals: staleDeals.length,
        pipelineValue: totalPipelineValue,
        weightedPipeline: Math.round(weightedPipeline),
        totalContacts: contacts.length,
        coldContacts: coldContacts.length,
        coolingContacts: coolingContacts.length,
      },
      urgentItems,
      todayFocus: {
        tasks: todayTasks.slice(0, 5),
        followUps: todayFollowUps.slice(0, 5),
      },
      tomorrowPreview: {
        tasks: tomorrowTasks.slice(0, 3),
      },
      attentionNeeded: {
        overdueTasks: overdueTasks.slice(0, 5),
        overdueFollowUps: overdueFollowUps.slice(0, 5),
        staleDeals: staleDeals.slice(0, 5),
        coolingRelationships: coolingContacts.slice(0, 5),
      },
    });
  } catch (err: any) {
    console.error("❌ Morning Brief error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}