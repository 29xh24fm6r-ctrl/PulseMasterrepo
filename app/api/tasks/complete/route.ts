import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { calculateXPAward, STANDARD_XP } from "@/lib/identity/xp-helper";
import { ArchetypeId } from "@/lib/identity/types";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const TASKS_DB = process.env.NOTION_DATABASE_TASKS;
const XP_DB = process.env.NOTION_DATABASE_XP;

export async function POST(request: NextRequest) {
  try {
    const { taskId, priority, taskName, activeArchetype } = await request.json();

    if (!taskId) {
      return NextResponse.json({ ok: false, error: "taskId required" }, { status: 400 });
    }

    // Mark task as complete in Notion
    if (TASKS_DB) {
      try {
        await notion.pages.update({
          page_id: taskId,
          properties: {
            Status: { status: { name: "Done" } },
            "Completed Date": { date: { start: new Date().toISOString() } },
          },
        });
      } catch (e) {
        console.error("Failed to update task in Notion:", e);
      }
    }

    // Calculate XP with identity bonus
    const priorityXP: Record<string, number> = {
      low: STANDARD_XP.task_low,
      medium: STANDARD_XP.task_medium,
      high: STANDARD_XP.task_high,
      urgent: STANDARD_XP.task_urgent,
    };
    const baseXP = priorityXP[priority?.toLowerCase()] || STANDARD_XP.task_medium;

    const xpResult = calculateXPAward(baseXP, "DXP", "task_completed", {
      activeArchetype: activeArchetype as ArchetypeId | null,
      critChance: 0.05,
      critMultiplier: 2,
    });

    // Log XP to Notion
    if (XP_DB) {
      try {
        await notion.pages.create({
          parent: { database_id: XP_DB.replace(/-/g, "") },
          properties: {
            Name: { title: [{ text: { content: `Task: ${taskName || "Completed"}` } }] },
            Amount: { number: xpResult.finalXP },
            Category: { select: { name: xpResult.category } },
            Activity: { select: { name: "task_completed" } },
            Date: { date: { start: new Date().toISOString() } },
            ...(xpResult.wasCrit && { Crit: { checkbox: true } }),
            ...(xpResult.bonusApplied && {
              Notes: {
                rich_text: [
                  {
                    text: {
                      content: `Identity bonus: ${xpResult.archetypeName} +${xpResult.bonusAmount} XP`,
                    },
                  },
                ],
              },
            }),
          },
        });
      } catch (e) {
        console.error("Failed to log XP:", e);
      }
    }

    return NextResponse.json({
      ok: true,
      taskId,
      xp: {
        base: xpResult.baseXP,
        final: xpResult.finalXP,
        category: xpResult.category,
        wasCrit: xpResult.wasCrit,
        critMultiplier: xpResult.critMultiplier,
        identityBonus: xpResult.bonusApplied
          ? {
              archetype: xpResult.archetypeName,
              amount: xpResult.bonusAmount,
              multiplier: xpResult.bonusMultiplier,
            }
          : null,
      },
    });
  } catch (error: unknown) {
    console.error("Task complete error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
