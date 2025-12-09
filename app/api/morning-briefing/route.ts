import { auth } from "@clerk/nextjs/server";
import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
// app/api/morning-briefing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import OpenAI from "openai";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const TASKS_DB = process.env.NOTION_DATABASE_TASKS;
const FOLLOW_UPS_DB = process.env.NOTION_DATABASE_FOLLOW_UPS;
const DEALS_DB = process.env.NOTION_DATABASE_DEALS;
const HABITS_DB = process.env.NOTION_DATABASE_HABITS;
const SECOND_BRAIN_DB = process.env.NOTION_DATABASE_SECOND_BRAIN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!NOTION_API_KEY) throw new Error("Missing NOTION_API_KEY");

const notion = new Client({ auth: NOTION_API_KEY });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

function normalizeDatabaseId(id: string): string {
  return id.replace(/-/g, "");
}

// ============================================
// Data Fetching Functions
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

async function fetchTasks(): Promise<Task[]> {
  if (!TASKS_DB) return [];
  const tasks: Task[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  try {
    // Query ALL tasks without filtering by status - we'll filter in code
    // This avoids Notion API errors about property type mismatches
    const response = await notion.databases.query({
      database_id: normalizeDatabaseId(TASKS_DB),
      page_size: 100,
    });

    for (const page of response.results) {
      const props = (page as any).properties || {};
      const name = props.Name?.title?.[0]?.plain_text || "Untitled";
      // Handle both select and status property types
      const status = props.Status?.select?.name || props.Status?.status?.name || "Pending";
      const priority = props.Priority?.select?.name || "Medium";
      const dueDate = props["Due Date"]?.date?.start || null;

      // Skip completed tasks in code
      if (status === "Done" || status === "Completed" || status === "Cancelled") continue;

      let isOverdue = false;
      let isDueToday = false;
      let isDueTomorrow = false;
      let daysOverdue = 0;

      if (dueDate) {
        if (dueDate < todayStr) {
          isOverdue = true;
          const due = new Date(dueDate);
          daysOverdue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        } else if (dueDate === todayStr) {
          isDueToday = true;
        } else if (dueDate === tomorrowStr) {
          isDueTomorrow = true;
        }
      }

      tasks.push({
        id: (page as any).id,
        name,
        status,
        priority,
        dueDate,
        isOverdue,
        isDueToday,
        isDueTomorrow,
        daysOverdue,
      });
    }
  } catch (err) {
    console.error("Error fetching tasks:", err);
  }

  return tasks;
}

async function fetchFollowUps(): Promise<FollowUp[]> {
  if (!FOLLOW_UPS_DB) return [];
  const followUps: FollowUp[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  try {
    // Query all follow-ups, filter in code
    const response = await notion.databases.query({
      database_id: normalizeDatabaseId(FOLLOW_UPS_DB),
      page_size: 100,
    });

    for (const page of response.results) {
      const props = (page as any).properties || {};
      const name = props.Name?.title?.[0]?.plain_text || "Untitled";
      const status = props.Status?.select?.name || props.Status?.status?.name || "Pending";
      const priority = props.Priority?.select?.name || "Medium";
      const dueDate = props["Due Date"]?.date?.start || null;
      const type = props.Type?.select?.name || "Follow-up";

      // Skip completed in code
      if (status === "Sent" || status === "Responded" || status === "Cancelled" || status === "Done") continue;

      let isOverdue = false;
      let isDueToday = false;

      if (dueDate) {
        if (dueDate < todayStr) {
          isOverdue = true;
        } else if (dueDate === todayStr) {
          isDueToday = true;
        }
      }

      followUps.push({
        id: (page as any).id,
        name,
        status,
        priority,
        dueDate,
        type,
        isOverdue,
        isDueToday,
      });
    }
  } catch (err) {
    console.error("Error fetching follow-ups:", err);
  }

  return followUps;
}

async function fetchDeals(): Promise<Deal[]> {
  if (!DEALS_DB) return [];
  const deals: Deal[] = [];
  const today = new Date();

  try {
    const response = await notion.databases.query({
      database_id: normalizeDatabaseId(DEALS_DB),
      page_size: 100,
    });

    for (const page of response.results) {
      const props = (page as any).properties || {};
      const name = props.Name?.title?.[0]?.plain_text || 
                   props.Deal?.title?.[0]?.plain_text || "Untitled";
      const stage = props.Stage?.select?.name || props.Stage?.status?.name || props.Status?.select?.name || "Unknown";
      const value = props.Value?.number || props.Amount?.number || 0;
      const probability = props.Probability?.number || 50;
      
      // Skip closed deals
      if (stage === "Closed Won" || stage === "Closed Lost" || stage === "Closed") continue;

      const lastEdited = new Date((page as any).last_edited_time);
      const daysSinceUpdate = Math.floor((today.getTime() - lastEdited.getTime()) / (1000 * 60 * 60 * 24));
      const isStale = daysSinceUpdate > 7;

      deals.push({
        id: (page as any).id,
        name,
        stage,
        value,
        probability,
        daysSinceUpdate,
        isStale,
      });
    }
  } catch (err) {
    console.error("Error fetching deals:", err);
  }

  return deals;
}

async function fetchContacts(): Promise<Contact[]> {
  if (!SECOND_BRAIN_DB) return [];
  const contacts: Contact[] = [];
  const today = new Date();

  try {
    // Try with Type filter, fall back to no filter
    let response;
    try {
      response = await notion.databases.query({
        database_id: normalizeDatabaseId(SECOND_BRAIN_DB),
        filter: {
          property: "Type",
          select: { equals: "Person" },
        },
        page_size: 100,
      });
    } catch {
      response = await notion.databases.query({
        database_id: normalizeDatabaseId(SECOND_BRAIN_DB),
        page_size: 100,
      });
    }

    for (const page of response.results) {
      const props = (page as any).properties || {};
      const name = props.Name?.title?.[0]?.plain_text || "Unknown";
      const email = props.Email?.email || "";
      const lastContact = props["Last Contact"]?.date?.start || null;

      let daysSinceContact = 999;
      let relationshipStatus: "cold" | "cooling" | "warm" | "hot" = "cold";

      if (lastContact) {
        const lastDate = new Date(lastContact);
        daysSinceContact = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceContact <= 7) relationshipStatus = "hot";
        else if (daysSinceContact <= 14) relationshipStatus = "warm";
        else if (daysSinceContact <= 30) relationshipStatus = "cooling";
        else relationshipStatus = "cold";
      }

      contacts.push({
        id: (page as any).id,
        name,
        email,
        lastContact,
        daysSinceContact,
        relationshipStatus,
      });
    }
  } catch (err) {
    console.error("Error fetching contacts:", err);
  }

  return contacts;
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

  const coldContacts = contacts.filter(c => c.relationshipStatus === "cold");
  const coolingContacts = contacts.filter(c => c.relationshipStatus === "cooling");

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
      fetchTasks(),
      fetchFollowUps(),
      fetchDeals(),
      fetchContacts(),
    ]);

    console.log(`📋 Tasks: ${tasks.length}`);
    console.log(`📅 Follow-ups: ${followUps.length}`);
    console.log(`💰 Deals: ${deals.length}`);
    console.log(`👥 Contacts: ${contacts.length}`);

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

    const coldContacts = contacts.filter(c => c.relationshipStatus === "cold");
    const coolingContacts = contacts.filter(c => c.relationshipStatus === "cooling");

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