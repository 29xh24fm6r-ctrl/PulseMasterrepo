import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { calculateXPAward, STANDARD_XP } from "@/lib/identity/xp-helper";
import { ArchetypeId } from "@/lib/identity/types";
import { logThirdBrainEvent } from "@/lib/third-brain/service";
import { auth } from "@clerk/nextjs/server";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const HABITS_DB = process.env.NOTION_DATABASE_HABITS;
const XP_DB = process.env.NOTION_DATABASE_XP;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const { habitId, habitName, date, activeArchetype } = await request.json();
    
    if (!habitId) {
      return NextResponse.json({ ok: false, error: "habitId required" }, { status: 400 });
    }
    
    const logDate = date || new Date().toISOString().split("T")[0];
    const propertyName = logDate; // Notion uses date as property name for habit tracking
    
    // Update habit in Notion (mark date as complete)
    if (HABITS_DB) {
      try {
        // This assumes habits have checkbox properties for each date
        // Adjust based on actual Notion structure
        await notion.pages.update({
          page_id: habitId,
          properties: {
            [propertyName]: { checkbox: true },
          },
        });
      } catch (e) {
        console.error("Failed to update habit in Notion:", e);
        // Continue anyway - XP should still be awarded
      }
    }
    
    // Calculate XP with identity bonus (habits are MXP - Maintenance)
    const xpResult = calculateXPAward(STANDARD_XP.habit_completed, "MXP", "habit_completed", {
      activeArchetype: activeArchetype as ArchetypeId | null,
      critChance: 0.05,
      critMultiplier: 2,
    });
    
    // Log XP
    if (XP_DB) {
      try {
        await notion.pages.create({
          parent: { database_id: XP_DB.replace(/-/g, "") },
          properties: {
            Name: { title: [{ text: { content: `Habit: ${habitName || "Completed"}` } }] },
            Amount: { number: xpResult.finalXP },
            Category: { select: { name: xpResult.category } },
            Activity: { select: { name: "habit_completed" } },
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

    // Log to Third Brain
    if (userId) {
      await logThirdBrainEvent({
        userId,
        type: "habit_completed",
        source: "notion",
        title: `Habit: ${habitName || "Completed"}`,
        summary: `+${xpResult.finalXP} XP${xpResult.wasCrit ? " (CRIT!)" : ""}`,
        rawPayload: {
          habitId,
          habitName,
          date: logDate,
          xpAwarded: xpResult.finalXP,
          wasCrit: xpResult.wasCrit,
          category: xpResult.category,
        },
      });
    }
    
    return NextResponse.json({
      ok: true,
      habitId,
      date: logDate,
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
    console.error("Habit log error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}