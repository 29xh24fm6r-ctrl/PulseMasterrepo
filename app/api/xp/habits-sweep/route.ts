import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { normalizeDatabaseId } from "@/app/lib/notion";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const HABITS_DB_RAW = process.env.NOTION_DATABASE_HABITS;
const XP_DB_RAW = process.env.NOTION_DATABASE_XP;

if (!NOTION_API_KEY) {
  throw new Error("NOTION_API_KEY is not set in environment");
}
if (!HABITS_DB_RAW) {
  throw new Error("NOTION_DATABASE_HABITS is not set in environment");
}

const notion = new Client({ auth: NOTION_API_KEY });
const HABITS_DB = normalizeDatabaseId(HABITS_DB_RAW);
const XP_DB = XP_DB_RAW ? normalizeDatabaseId(XP_DB_RAW) : null;

function getTitle(props: any, field: string = "Name"): string {
  const titleProp = props[field]?.title?.[0]?.plain_text;
  return titleProp || "Untitled";
}

export async function POST() {
  try {
    if (!XP_DB) {
      return NextResponse.json({
        ok: false,
        error: "XP database not configured",
      });
    }

    const habitsResponse = await notion.databases.query({
      database_id: HABITS_DB,
    });

    const habits = (habitsResponse.results || []).filter((page: any) => {
      const props = page.properties || {};
      const xp = props["XP"]?.number || 0;
      return xp > 0;
    });

    let totalXp = 0;
    let matched = 0;

    for (const habit of habits) {
      const props = (habit as any).properties || {};
      const xp = props["XP"]?.number || 0;
      const habitName = getTitle(props);

      await notion.pages.create({
        parent: { database_id: XP_DB },
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: `Habit: ${habitName}`,
                },
              },
            ],
          },
          XP: {
            number: xp,
          },
          Source: {
            rich_text: [
              {
                text: {
                  content: "Habit Completion",
                },
              },
            ],
          },
        },
      });

      totalXp += xp;
      matched += 1;
    }

    return NextResponse.json({
      ok: true,
      matched,
      totalXp,
    });
  } catch (err: any) {
    console.error("Habit XP sweep error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to sweep habit XP",
      },
      { status: 500 }
    );
  }
}