import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { normalizeDatabaseId } from "@/app/lib/notion";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const TASKS_DB_RAW = process.env.NOTION_DATABASE_TASKS;
const XP_DB_RAW = process.env.NOTION_DATABASE_XP;

if (!NOTION_API_KEY) {
  throw new Error("NOTION_API_KEY is not set in environment");
}
if (!TASKS_DB_RAW) {
  throw new Error("NOTION_DATABASE_TASKS is not set in environment");
}

const notion = new Client({ auth: NOTION_API_KEY });
const TASKS_DB = normalizeDatabaseId(TASKS_DB_RAW);
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

    const tasksResponse = await notion.databases.query({
      database_id: TASKS_DB,
    });

    const completedTasks = (tasksResponse.results || []).filter((page: any) => {
      const props = page.properties || {};
      const status = props["Status"]?.status?.name || props["Status"]?.select?.name || null;
      const isDone = status === "Done" || status === "Completed" || status === "Complete";
      const xp = props["XP"]?.number || 0;
      return isDone && xp > 0;
    });

    let totalXp = 0;
    let bonusXp = 0;
    let entries = 0;

    for (const task of completedTasks) {
      const props = (task as any).properties || {};
      const baseXp = props["XP"]?.number || 0;
      const taskName = getTitle(props);
      
      // Check for identity tags
      const identityTags = props["Identity"]?.multi_select || [];
      const hasIdentity = identityTags.length > 0;
      
      // Apply 2x multiplier if identity-tagged
      const multiplier = hasIdentity ? 2 : 1;
      const finalXp = baseXp * multiplier;
      const bonus = finalXp - baseXp;
      
      bonusXp += bonus;
      totalXp += finalXp;

      // Build identity label
      let identityLabel = "No Identity";
      if (identityTags.length > 0) {
        identityLabel = identityTags.map((tag: any) => tag.name).join(", ");
      }

      await notion.pages.create({
        parent: { database_id: XP_DB },
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: `${taskName}${hasIdentity ? " 🔥" : ""}`,
                },
              },
            ],
          },
          XP: {
            number: finalXp,
          },
          Source: {
            rich_text: [
              {
                text: {
                  content: hasIdentity 
                    ? `Task (${identityLabel}) - 2x Multiplier!` 
                    : "Task Completion",
                },
              },
            ],
          },
        },
      });

      entries += 1;
    }

    return NextResponse.json({
      ok: true,
      entries,
      totalXp,
      bonusXp,
      message: bonusXp > 0 
        ? `Earned ${totalXp} XP (including ${bonusXp} bonus from identity alignment!)` 
        : `Earned ${totalXp} XP`,
    });
  } catch (err: any) {
    console.error("XP sweep error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to sweep XP",
      },
      { status: 500 }
    );
  }
}