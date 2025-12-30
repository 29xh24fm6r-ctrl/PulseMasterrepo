import { NextResponse } from "next/server";
import { getTasks } from "@/lib/data/tasks";
import { getDeals } from "@/lib/data/deals";
import { getJournalEntries, createJournalEntry } from "@/lib/data/journal";
import { auth } from "@clerk/nextjs/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const todayStr = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const [tasks, deals, journalEntries] = await Promise.all([
      getTasks(userId),
      getDeals(userId),
      getJournalEntries(userId, 50)
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Process Tasks
    const completedToday = tasks.filter((t) => {
      const isDone = t.status === "done" || t.status === "completed";
      const completedAt = t.completed_at ? new Date(t.completed_at) : null;
      return isDone && completedAt && completedAt >= todayStart;
    }).map(t => ({ id: t.id, name: t.title, xp: t.xp || 0 }));

    // Note: Implicit completion time assumption for simplicity if completed_at missing but status done?
    // In Supabase we set completed_at when marking done.

    const incompleteTasks = tasks.filter(t => t.status !== "done" && t.status !== "completed")
      .map(t => ({ id: t.id, name: t.title }));

    // Process Deals
    const dealsMovedToday = deals.filter(d => {
      const updatedAt = new Date(d.updated_at);
      return updatedAt >= todayStart;
    }).map(d => ({ id: d.id, name: d.title, stage: d.stage }));

    // Process XP
    let xpToday = 0;

    // XP from Journal (Identity Actions)
    xpToday += journalEntries
      .filter(e => new Date(e.created_at) >= todayStart)
      .reduce((sum, e) => sum + (e.xp_awarded || 0), 0);

    // XP from Tasks
    xpToday += completedToday.reduce((sum, t) => sum + (t.xp || 0), 0);

    // Total XP (Approximation based on available history or maybe just today for now?)
    // Real total XP should come from a user stats table or aggregating all history.
    // For now returning Today's XP as a proxy or 0 for total if unavailable.
    const xpTotal = xpToday;

    // Tomorrow Focus
    const tomorrowFocus = [];

    if (incompleteTasks.length > 0) {
      tomorrowFocus.push(`Complete ${incompleteTasks[0].name}`);
    }

    if (dealsMovedToday.length > 0) {
      tomorrowFocus.push(`Continue momentum on ${dealsMovedToday[0].name}`);
    } else if (deals.length > 0) {
      // Find a deal not closed
      const activeDeal = deals.find(d => !['Closed Won', 'Lost'].includes(d.stage));
      if (activeDeal) tomorrowFocus.push(`Advance ${activeDeal.title} to next stage`);
    }

    if (tomorrowFocus.length < 3) {
      const defaults = [
        "Start with a 25-minute deep work block",
        "Do one proactive outreach (no ask, just value)",
        "Move your most important deal forward",
      ];
      defaults.forEach((item) => {
        if (tomorrowFocus.length < 3) tomorrowFocus.push(item);
      });
    }

    const reflectionPrompts = [
      "What was your biggest win today?",
      "What challenged you and how did you handle it?",
      "Did you show up as the person you want to become?",
    ];

    return NextResponse.json({
      ok: true,
      date: todayStr,
      completedTasks: completedToday.slice(0, 10),
      dealsMovedToday: dealsMovedToday.slice(0, 5),
      incompleteTasks: incompleteTasks.slice(0, 5),
      xpToday,
      xpTotal,
      tomorrowFocus,
      reflectionPrompts,
      stats: {
        tasksCompleted: completedToday.length,
        dealsMoved: dealsMovedToday.length,
        looseEnds: incompleteTasks.length,
      },
    });
  } catch (err: any) {
    console.error("Nightly shutdown error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to generate nightly shutdown",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { wins, reflection, looseEnds, tomorrowPlan } = body;

    // Save Shutdown Log to Journal
    await createJournalEntry(userId, {
      title: `Nightly Burn: ${new Date().toLocaleDateString()}`,
      content: `
**Wins:** ${wins}
**Reflection:** ${reflection}
**Loose Ends:** ${looseEnds}
**Tomorrow's Plan:** ${tomorrowPlan}
        `,
      tags: ['Shutdown', 'Reflection'],
      xp_awarded: 10 // Award XP for completing shutdown
    });

    return NextResponse.json({
      ok: true,
      message: "Shutdown complete. Rest well, Warrior.",
    });
  } catch (err: any) {
    console.error("Nightly shutdown POST error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to save shutdown data",
      },
      { status: 500 }
    );
  }
}
