import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { getAutonomyStatus, shouldShowMorningBrief, isInQuietHours } from "@/lib/autonomy-behavior";
import { generateIdentityInsights, generateIdentitySummary } from "@/lib/identity/insights";
import { IdentityState, ARCHETYPES } from "@/lib/identity/types";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const TASKS_DB = process.env.NOTION_DATABASE_TASKS;
const DEALS_DB = process.env.NOTION_DATABASE_DEALS;
const HABITS_DB = process.env.NOTION_DATABASE_HABITS;

interface MorningBriefResponse {
  ok: boolean;
  suppressed?: boolean;
  reason?: string;
  brief?: {
    greeting: string;
    date: string;
    weather?: string;
    
    // Tasks summary
    tasks: {
      total: number;
      urgent: number;
      high: number;
      topTasks: { id: string; name: string; priority: string }[];
    };
    
    // Deals summary
    deals: {
      active: number;
      needsAttention: number;
      topDeals: { id: string; name: string; stage: string; value?: number }[];
    };
    
    // Habits
    habits: {
      total: number;
      completedYesterday: number;
      streak: number;
    };
    
    // Identity insights (NEW)
    identity: {
      summary: string;
      insights: {
        type: string;
        priority: string;
        title: string;
        message: string;
        icon: string;
        actionable?: { label: string; href: string };
      }[];
      activeArchetype?: {
        name: string;
        icon: string;
        xpBonus: string;
      };
    };
    
    // Motivational
    quote?: string;
    focusSuggestion?: string;
  };
  autonomyStatus?: {
    level: string;
    isQuietHours: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings, identityState } = body;

    // Check autonomy
    if (settings) {
      const autonomyStatus = getAutonomyStatus(settings);
      
      if (!shouldShowMorningBrief(settings) || isInQuietHours(settings)) {
        return NextResponse.json({
          ok: true,
          suppressed: true,
          reason: autonomyStatus.level === "zen" ? "Zen mode active" : "Quiet hours",
          autonomyStatus,
        });
      }
    }

    const brief = await generateMorningBrief(identityState);
    
    return NextResponse.json({
      ok: true,
      brief,
      autonomyStatus: settings ? getAutonomyStatus(settings) : undefined,
    });

  } catch (error: unknown) {
    console.error("Morning brief error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const brief = await generateMorningBrief(null);
    return NextResponse.json({ ok: true, brief });
  } catch (error: unknown) {
    console.error("Morning brief error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

async function generateMorningBrief(identityState: IdentityState | null) {
  const now = new Date();
  const hour = now.getHours();
  
  // Greeting based on time
  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) greeting = "Good afternoon";
  else if (hour >= 17) greeting = "Good evening";

  // Format date
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Fetch tasks
  let tasks = { total: 0, urgent: 0, high: 0, topTasks: [] as any[] };
  if (TASKS_DB) {
    try {
      const tasksRes = await notion.databases.query({
        database_id: TASKS_DB.replace(/-/g, ""),
        filter: {
          and: [
            { property: "Status", status: { does_not_equal: "Done" } },
          ],
        },
        sorts: [{ property: "Priority", direction: "descending" }],
        page_size: 10,
      });

      const tasksList = tasksRes.results.map((page: any) => {
        const props = page.properties || {};
        return {
          id: page.id,
          name: props.Name?.title?.[0]?.plain_text || props.Task?.title?.[0]?.plain_text || "Untitled",
          priority: props.Priority?.select?.name || "Medium",
        };
      });

      tasks = {
        total: tasksList.length,
        urgent: tasksList.filter((t) => t.priority === "Urgent").length,
        high: tasksList.filter((t) => t.priority === "High").length,
        topTasks: tasksList.slice(0, 3),
      };
    } catch (e) {
      console.error("Failed to fetch tasks:", e);
    }
  }

  // Fetch deals
  let deals = { active: 0, needsAttention: 0, topDeals: [] as any[] };
  if (DEALS_DB) {
    try {
      const dealsRes = await notion.databases.query({
        database_id: DEALS_DB.replace(/-/g, ""),
        filter: {
          property: "Status",
          select: { does_not_equal: "Closed Won" },
        },
        sorts: [{ property: "Value", direction: "descending" }],
        page_size: 10,
      });

      const dealsList = dealsRes.results.map((page: any) => {
        const props = page.properties || {};
        return {
          id: page.id,
          name: props.Name?.title?.[0]?.plain_text || props.Deal?.title?.[0]?.plain_text || "Untitled",
          stage: props.Stage?.select?.name || props.Status?.select?.name || "Unknown",
          value: props.Value?.number || 0,
        };
      });

      deals = {
        active: dealsList.length,
        needsAttention: dealsList.filter((d) => 
          d.stage === "Stalled" || d.stage === "At Risk"
        ).length,
        topDeals: dealsList.slice(0, 3),
      };
    } catch (e) {
      console.error("Failed to fetch deals:", e);
    }
  }

  // Habits placeholder
  const habits = {
    total: 0,
    completedYesterday: 0,
    streak: 0,
  };

  // Generate identity insights
  let identity = {
    summary: "Enable identity tracking to see personalized insights.",
    insights: [] as any[],
    activeArchetype: undefined as any,
  };

  if (identityState) {
    const insights = generateIdentityInsights(identityState);
    const summary = generateIdentitySummary(identityState);

    identity = {
      summary,
      insights: insights.map((i) => ({
        type: i.type,
        priority: i.priority,
        title: i.title,
        message: i.message,
        icon: i.icon,
        actionable: i.actionable,
      })),
      activeArchetype: identityState.activeArchetype
        ? {
            name: ARCHETYPES[identityState.activeArchetype].name,
            icon: ARCHETYPES[identityState.activeArchetype].icon,
            xpBonus: `+25% ${ARCHETYPES[identityState.activeArchetype].xpBonus.category}`,
          }
        : undefined,
    };
  }

  // Motivational quotes
  const quotes = [
    "The way to get started is to quit talking and begin doing. — Walt Disney",
    "Success is not final, failure is not fatal: it is the courage to continue that counts. — Winston Churchill",
    "Discipline is choosing between what you want now and what you want most.",
    "You don't have to be great to start, but you have to start to be great. — Zig Ziglar",
    "The only way to do great work is to love what you do. — Steve Jobs",
    "Hard work beats talent when talent doesn't work hard. — Tim Notke",
    "Action is the foundational key to all success. — Pablo Picasso",
  ];
  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  // Focus suggestion based on data
  let focusSuggestion = "Start with your most important task.";
  if (tasks.urgent > 0) {
    focusSuggestion = `You have ${tasks.urgent} urgent task${tasks.urgent > 1 ? "s" : ""}. Consider tackling ${tasks.urgent > 1 ? "those" : "that"} first.`;
  } else if (deals.needsAttention > 0) {
    focusSuggestion = `${deals.needsAttention} deal${deals.needsAttention > 1 ? "s" : ""} need${deals.needsAttention === 1 ? "s" : ""} attention. Review your pipeline.`;
  } else if (identity.insights.length > 0 && identity.insights[0].priority === "high") {
    focusSuggestion = identity.insights[0].message;
  }

  return {
    greeting,
    date: dateStr,
    tasks,
    deals,
    habits,
    identity,
    quote,
    focusSuggestion,
  };
}
