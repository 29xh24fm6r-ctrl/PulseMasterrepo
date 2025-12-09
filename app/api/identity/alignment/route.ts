import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { normalizeDatabaseId } from "@/app/lib/notion";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const XP_DB_RAW = process.env.NOTION_DATABASE_XP;

if (!NOTION_API_KEY) {
  throw new Error("NOTION_API_KEY is not set");
}

const notion = new Client({ auth: NOTION_API_KEY });
const XP_DB = XP_DB_RAW ? normalizeDatabaseId(XP_DB_RAW) : null;

export async function GET() {
  try {
    if (!XP_DB) {
      return NextResponse.json({
        ok: true,
        alignment: {},
        totalXp: 0,
      });
    }

    // Get today's XP entries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const response = await notion.databases.query({
      database_id: XP_DB,
      filter: {
        timestamp: "created_time",
        created_time: {
          on_or_after: todayStart.toISOString(),
        },
      },
    });

    // Count XP by identity dimension
    const alignment: Record<string, number> = {
      executor: 0,
      creator: 0,
      connector: 0,
      strategist: 0,
      warrior: 0,
      grower: 0,
    };

    let totalXp = 0;

    (response.results || []).forEach((page: any) => {
      const props = page.properties || {};
      const xp = props["XP"]?.number || 0;
      const source = props["Source"]?.rich_text?.[0]?.plain_text || "";

      totalXp += xp;

      // Parse identity from source string
      if (source.includes("Executor")) alignment.executor += xp;
      if (source.includes("Creator")) alignment.creator += xp;
      if (source.includes("Connector")) alignment.connector += xp;
      if (source.includes("Strategist")) alignment.strategist += xp;
      if (source.includes("Warrior")) alignment.warrior += xp;
      if (source.includes("Grower")) alignment.grower += xp;
    });

    // Calculate percentages
    const percentages: Record<string, number> = {};
    if (totalXp > 0) {
      Object.keys(alignment).forEach((key) => {
        percentages[key] = Math.round((alignment[key] / totalXp) * 100);
      });
    }

    return NextResponse.json({
      ok: true,
      alignment,
      percentages,
      totalXp,
    });
  } catch (err: any) {
    console.error("Identity alignment error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to get alignment data",
      },
      { status: 500 }
    );
  }
}
