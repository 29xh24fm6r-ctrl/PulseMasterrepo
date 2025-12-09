import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const NOTION_API_KEY = process.env.NOTION_API_KEY;

if (!NOTION_API_KEY) {
  throw new Error("NOTION_API_KEY is not set");
}

const notion = new Client({ auth: NOTION_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { followUpId, status } = body;

    if (!followUpId || !status) {
      return NextResponse.json(
        { ok: false, error: "Missing required data" },
        { status: 400 }
      );
    }

    console.log(`📝 Updating follow-up ${followUpId} to ${status}`);

    await notion.pages.update({
      page_id: followUpId,
      properties: {
        Status: {
          select: { name: status },
        },
      },
    });

    console.log("✅ Status updated!");

    return NextResponse.json({
      ok: true,
      status,
    });
  } catch (err: any) {
    console.error("Update status error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to update status",
      },
      { status: 500 }
    );
  }
}