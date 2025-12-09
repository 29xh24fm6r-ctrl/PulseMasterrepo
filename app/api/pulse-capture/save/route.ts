import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { normalizeDatabaseId } from "@/app/lib/notion";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const KNOWLEDGE_BASE_DB_RAW = process.env.NOTION_DATABASE_KNOWLEDGE_BASE;

if (!NOTION_API_KEY || !KNOWLEDGE_BASE_DB_RAW) {
  throw new Error("Missing Notion configuration");
}

const notion = new Client({ auth: NOTION_API_KEY });
const KNOWLEDGE_BASE_DB = normalizeDatabaseId(KNOWLEDGE_BASE_DB_RAW);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, type, sourceUrl, summary, keyInsights, actionableItems, quotes, tags, transcript, duration, relatedTo } = body;

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "Missing title" },
        { status: 400 }
      );
    }

    console.log("💾 Saving to Knowledge Base...");

    // Format insights as bullet points
    const insightsBullets = (keyInsights || []).map((i: string) => `• ${i}`).join("\n");
    const actionsBullets = (actionableItems || []).map((i: string) => `• ${i}`).join("\n");
    const quotesBullets = (quotes || []).map((q: string) => `"${q}"`).join("\n\n");

    const properties: any = {
      Title: {
        title: [{ text: { content: title.substring(0, 2000) } }],
      },
    };

    if (type) {
      properties["Type"] = {
        select: { name: type },
      };
    }

    if (sourceUrl) {
      properties["Source URL"] = {
        url: sourceUrl,
      };
    }

    if (summary) {
      properties["Summary"] = {
        rich_text: [{ text: { content: summary.substring(0, 2000) } }],
      };
    }

    if (insightsBullets) {
      properties["Key Insights"] = {
        rich_text: [{ text: { content: insightsBullets.substring(0, 2000) } }],
      };
    }

    if (actionsBullets) {
      properties["Actionable Items"] = {
        rich_text: [{ text: { content: actionsBullets.substring(0, 2000) } }],
      };
    }

    if (quotesBullets) {
      properties["Quotes"] = {
        rich_text: [{ text: { content: quotesBullets.substring(0, 2000) } }],
      };
    }

    if (tags && tags.length > 0) {
      properties["Tags"] = {
        multi_select: tags.slice(0, 10).map((tag: string) => ({ name: tag })),
      };
    }

    if (transcript) {
      properties["Transcript"] = {
        rich_text: [{ text: { content: transcript.substring(0, 2000) } }],
      };
    }

    if (duration) {
      properties["Duration"] = {
        number: duration,
      };
    }

    if (relatedTo) {
      properties["Related To"] = {
        rich_text: [{ text: { content: relatedTo.substring(0, 2000) } }],
      };
    }

    properties["Date Added"] = {
      date: { start: new Date().toISOString() },
    };

    const page = await notion.pages.create({
      parent: { database_id: KNOWLEDGE_BASE_DB },
      properties,
    });

    console.log("✅ Saved to Knowledge Base!");

    return NextResponse.json({
      ok: true,
      pageId: page.id,
    });
  } catch (err: any) {
    console.error("Save to Notion error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to save to Notion",
      },
      { status: 500 }
    );
  }
}
