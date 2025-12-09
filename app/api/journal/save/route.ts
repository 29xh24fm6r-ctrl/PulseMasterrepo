import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { calculateXPAward, STANDARD_XP } from "@/lib/identity/xp-helper";
import { ArchetypeId } from "@/lib/identity/types";
import { logThirdBrainEvent } from "@/lib/third-brain/service";
import { auth } from "@clerk/nextjs/server";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const JOURNAL_DB = process.env.NOTION_DATABASE_JOURNAL;
const XP_DB = process.env.NOTION_DATABASE_XP;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const { title, content, mood, tags, activeArchetype } = await request.json();
    
    if (!content) {
      return NextResponse.json({ ok: false, error: "content required" }, { status: 400 });
    }
    
    let pageId: string | null = null;
    
    // Save to Notion
    if (JOURNAL_DB) {
      try {
        const page = await notion.pages.create({
          parent: { database_id: JOURNAL_DB.replace(/-/g, "") },
          properties: {
            Name: { title: [{ text: { content: title || `Journal ${new Date().toLocaleDateString()}` } }] },
            Date: { date: { start: new Date().toISOString() } },
            ...(mood && { Mood: { select: { name: mood } } }),
            ...(tags?.length && {
              Tags: { multi_select: tags.map((t: string) => ({ name: t })) },
            }),
          },
          children: [
            {
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: [{ type: "text", text: { content } }],
              },
            },
          ],
        });
        pageId = page.id;
      } catch (e) {
        console.error("Failed to save journal to Notion:", e);
      }
    }
    
    // Calculate XP with identity bonus (journaling is IXP - Inner work)
    const xpResult = calculateXPAward(STANDARD_XP.journal_entry, "IXP", "journal_entry", {
      activeArchetype: activeArchetype as ArchetypeId | null,
      critChance: 0.08, // Slightly higher crit chance for reflection
      critMultiplier: 2,
    });
    
    // Log XP
    if (XP_DB) {
      try {
        await notion.pages.create({
          parent: { database_id: XP_DB.replace(/-/g, "") },
          properties: {
            Name: { title: [{ text: { content: "Journal Entry" } }] },
            Amount: { number: xpResult.finalXP },
            Category: { select: { name: xpResult.category } },
            Activity: { select: { name: "journal_entry" } },
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
        type: "journal",
        source: "manual",
        title: title || `Journal ${new Date().toLocaleDateString()}`,
        summary: content.substring(0, 200) + (content.length > 200 ? "..." : ""),
        rawPayload: {
          mood,
          tags,
          xpAwarded: xpResult.finalXP,
          wasCrit: xpResult.wasCrit,
        },
      });
    }
    
    return NextResponse.json({
      ok: true,
      pageId,
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
    console.error("Journal save error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}