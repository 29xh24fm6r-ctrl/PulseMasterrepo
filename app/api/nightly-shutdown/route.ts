import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { normalizeDatabaseId } from "@/app/lib/notion";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DEALS_DB_RAW = process.env.NOTION_DATABASE_DEALS;
const TASKS_DB_RAW = process.env.NOTION_DATABASE_TASKS;
const XP_DB_RAW = process.env.NOTION_DATABASE_XP;

if (!NOTION_API_KEY) {
  throw new Error("NOTION_API_KEY is not set in environment");
}
if (!DEALS_DB_RAW) {
  throw new Error("NOTION_DATABASE_DEALS is not set in environment");
}
if (!TASKS_DB_RAW) {
  throw new Error("NOTION_DATABASE_TASKS is not set in environment");
}

const notion = new Client({ auth: NOTION_API_KEY });
const DEALS_DB = normalizeDatabaseId(DEALS_DB_RAW);
const TASKS_DB = normalizeDatabaseId(TASKS_DB_RAW);
const XP_DB = XP_DB_RAW ? normalizeDatabaseId(XP_DB_RAW) : null;

function getTitle(props: any, field: string = "Name"): string {
  const titleProp = props[field]?.title?.[0]?.plain_text;
  return titleProp || "Untitled";
}

export async function GET() {
  try {
    const now = new Date();
    const today = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const tasksResponse = await notion.databases.query({
      database_id: TASKS_DB,
    });

    const allTasks = (tasksResponse.results || []).map((page: any) => {
      const props = page.properties || {};
      return {
        id: page.id,
        name: getTitle(props),
        status: props["Status"]?.status?.name || props["Status"]?.select?.name || null,
        xp: props["XP"]?.number || null,
        createdTime: page.created_time,
        lastEdited: page.last_edited_time,
      };
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const completedToday = allTasks.filter((task) => {
      const isDone =
        task.status === "Done" ||
        task.status === "Completed" ||
        task.status === "Complete";
      
      const editedDate = new Date(task.lastEdited);
      const wasEditedToday = editedDate >= todayStart;

      return isDone && wasEditedToday;
    });

    const incompleteTasks = allTasks.filter((task) => {
      const isDone =
        task.status === "Done" ||
        task.status === "Completed" ||
        task.status === "Complete";
      return !isDone;
    });

    const dealsResponse = await notion.databases.query({
      database_id: DEALS_DB,
    });

    const allDeals = (dealsResponse.results || []).map((page: any) => {
      const props = page.properties || {};
      return {
        id: page.id,
        name: getTitle(props, "Deal Name") || getTitle(props, "Name"),
        stage: props["Stage"]?.select?.name || props["Stage"]?.multi_select?.[0]?.name || null,
        lastEdited: page.last_edited_time,
      };
    });

    const dealsMovedToday = allDeals.filter((deal) => {
      const editedDate = new Date(deal.lastEdited);
      return editedDate >= todayStart;
    });

    let xpToday = 0;
    let xpTotal = 0;

    if (XP_DB) {
      try {
        const [todayXpRes, allXpRes] = await Promise.all([
          notion.databases.query({
            database_id: XP_DB,
            filter: {
              timestamp: "created_time",
              created_time: {
                on_or_after: todayStart.toISOString(),
              },
            },
          }),
          notion.databases.query({
            database_id: XP_DB,
          }),
        ]);

        xpToday = (todayXpRes.results || []).reduce((sum: number, page: any) => {
          const xp = page.properties?.["XP"]?.number || 0;
          return sum + xp;
        }, 0);

        xpTotal = (allXpRes.results || []).reduce((sum: number, page: any) => {
          const xp = page.properties?.["XP"]?.number || 0;
          return sum + xp;
        }, 0);
      } catch (err) {
        console.error("XP fetch error:", err);
      }
    }

    const tomorrowFocus = [];
    
    if (incompleteTasks.length > 0) {
      tomorrowFocus.push(`Complete ${incompleteTasks[0].name}`);
    }
    
    if (dealsMovedToday.length > 0) {
      tomorrowFocus.push(`Continue momentum on ${dealsMovedToday[0].name}`);
    } else if (allDeals.length > 0) {
      tomorrowFocus.push(`Advance ${allDeals[0].name} to next stage`);
    }
    
    if (tomorrowFocus.length < 3) {
      const defaults = [
        "Start with a 25-minute deep work block",
        "Do one proactive outreach (no ask, just value)",
        "Move your most important deal forward",
      ];
      defaults.forEach((item) => {
        if (tomorrowFocus.length < 3) tomorrowFocus.push(item);
      });
    }

    const reflectionPrompts = [
      "What was your biggest win today?",
      "What challenged you and how did you handle it?",
      "Did you show up as the person you want to become?",
    ];

    return NextResponse.json({
      ok: true,
      date: today,
      completedTasks: completedToday.slice(0, 10),
      dealsMovedToday: dealsMovedToday.slice(0, 5),
      incompleteTasks: incompleteTasks.slice(0, 5),
      xpToday,
      xpTotal,
      tomorrowFocus,
      reflectionPrompts,
      stats: {
        tasksCompleted: completedToday.length,
        dealsMoved: dealsMovedToday.length,
        looseEnds: incompleteTasks.length,
      },
    });
  } catch (err: any) {
    console.error("Nightly shutdown error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to generate nightly shutdown",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { wins, reflection, looseEnds, tomorrowPlan } = body;

    console.log("Nightly shutdown submitted:", {
      wins,
      reflection,
      looseEnds,
      tomorrowPlan,
    });

    return NextResponse.json({
      ok: true,
      message: "Shutdown complete. Rest well, Warrior.",
    });
  } catch (err: any) {
    console.error("Nightly shutdown POST error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to save shutdown data",
      },
      { status: 500 }
    );
  }
}
