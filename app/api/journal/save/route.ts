import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createJournalEntry } from "@/lib/data/journal";
import { calculateXPAward, STANDARD_XP } from "@/lib/identity/xp-helper";
import { logThirdBrainEvent } from "@/lib/third-brain/service";
import { ArchetypeId } from "@/lib/identity/types";
import { awardXP } from "@/lib/xp/award";
import { PulseCortex } from "@/lib/cortex";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { title, content, mood, tags, activeArchetype } = body;

    if (!content) {
      return NextResponse.json({ ok: false, error: "content required" }, { status: 400 });
    }

    // GOD MODE INTERCEPTOR
    // The Cortex sees this journal entry and decides if it needs to act.
    return await PulseCortex.intercept(
      {
        type: "journal_entry",
        payload: { title, content, mood, tags },
        context: {
          userId,
          source: "api/journal/save",
          timestamp: new Date()
        }
      },
      async () => {
        // --- ORIGINAL LOGIC ---

        // Calculate XP
        const xpResult = calculateXPAward(STANDARD_XP.journal_entry, "IXP", "journal_entry", {
          activeArchetype: activeArchetype as ArchetypeId | null,
          critChance: 0.08,
          critMultiplier: 2,
        });

        // Save to Supabase (feature history)
        const entry = await createJournalEntry(userId, {
          title: title || `Journal ${new Date().toLocaleDateString()}`,
          content,
          mood,
          tags: tags || [],
          xp_awarded: xpResult.finalXP
        });

        // Log to Global XP System
        await awardXP(userId, "journal_entry", "journal", {
          sourceId: entry.id,
          notes: title,
          customMultiplier: xpResult.bonusMultiplier
        });

        // Log to Third Brain
        await logThirdBrainEvent({
          userId,
          type: "journal",
          source: "manual",
          title: entry.title,
          summary: content.substring(0, 200) + (content.length > 200 ? "..." : ""),
          rawPayload: { mood, tags, xpAwarded: xpResult.finalXP, wasCrit: xpResult.wasCrit },
        });

        return NextResponse.json({
          ok: true,
          pageId: entry.id,
          xp: {
            base: xpResult.baseXP,
            final: xpResult.finalXP,
            wasCrit: xpResult.wasCrit,
          },
        });
      }
    );

  } catch (error: any) {
    console.error("Journal save error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}