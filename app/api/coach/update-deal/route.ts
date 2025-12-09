import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const NOTION_API_KEY = process.env.NOTION_API_KEY;

if (!NOTION_API_KEY) {
  throw new Error("NOTION_API_KEY is not set in environment");
}

const notion = new Client({ auth: NOTION_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { dealId, properties } = body;

    if (!dealId || !properties) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing dealId or properties",
        },
        { status: 400 }
      );
    }

    await notion.pages.update({
      page_id: dealId,
      properties,
    });

    return NextResponse.json({
      ok: true,
      message: "Deal updated successfully",
    });
  } catch (err: any) {
    console.error("Coach update-deal error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to update deal",
      },
      { status: 500 }
    );
  }
}
