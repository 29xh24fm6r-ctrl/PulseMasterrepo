import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { normalizeDatabaseId } from "@/app/lib/notion";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const TASKS_DB_RAW = process.env.NOTION_DATABASE_TASKS;

if (!NOTION_API_KEY) {
  throw new Error("NOTION_API_KEY is not set in environment");
}
if (!TASKS_DB_RAW) {
  throw new Error("NOTION_DATABASE_TASKS is not set in environment");
}

const notion = new Client({ auth: NOTION_API_KEY });
const TASKS_DB = normalizeDatabaseId(TASKS_DB_RAW);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { dealId, dealName, note } = body;

    if (!dealName || !note) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing dealName or note",
        },
        { status: 400 }
      );
    }

    const taskName = `Coach: Follow up on ${dealName}`;

    await notion.pages.create({
      parent: { database_id: TASKS_DB },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: taskName,
              },
            },
          ],
        },
        Status: {
          select: {
            name: "To Do",
          },
        },
        Notes: {
          rich_text: [
            {
              text: {
                content: note,
              },
            },
          ],
        },
        XP: {
          number: 10,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Task created successfully",
    });
  } catch (err: any) {
    console.error("Coach create-task error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to create task",
      },
      { status: 500 }
    );
  }
}
