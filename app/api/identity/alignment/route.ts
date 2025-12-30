import { NextResponse } from "next/server";
import { getJournalEntries } from "@/lib/data/journal";
import { auth } from "@clerk/nextjs/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    // Get today's journal entries (where XP is logged for identity actions)
    // We fetch last 100 entries to be safe for "today"
    const entries = await getJournalEntries(userId, 100);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEntries = entries.filter(e => new Date(e.created_at) >= todayStart);

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

    for (const entry of todayEntries) {
      const xp = entry.xp_awarded || 0;
      if (xp === 0) continue;

      totalXp += xp;

      // Infer alignment from tags or title
      // In track/route.ts we save tags: ['Identity', actionId, category]
      const tags = entry.tags || [];
      const content = (entry.content || "").toLowerCase();

      // Simple keyword matching based on Identity Categories
      // Categories: Health (Warrior), Wealth (Strategist), Wisdom (Grower), Relationships (Connector), Craft (Creator), Order (Executor)
      // Adjust mappings as needed based on lib/identity/types

      if (tags.some(t => t.toLowerCase() === 'health') || content.includes('health')) alignment.warrior += xp;
      if (tags.some(t => t.toLowerCase() === 'wealth') || content.includes('wealth')) alignment.strategist += xp;
      if (tags.some(t => t.toLowerCase() === 'wisdom') || content.includes('wisdom')) alignment.grower += xp;
      if (tags.some(t => t.toLowerCase() === 'relationships') || content.includes('relationship')) alignment.connector += xp;
      if (tags.some(t => t.toLowerCase() === 'craft') || content.includes('create')) alignment.creator += xp;
      if (tags.some(t => t.toLowerCase() === 'order') || content.includes('task') || content.includes('plan')) alignment.executor += xp;
    }

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
