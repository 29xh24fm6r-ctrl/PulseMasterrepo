
import { NextRequest, NextResponse } from 'next/server';
import { getJournalEntries } from "@/lib/data/journal";
import { getTasks } from "@/lib/data/tasks";
import { auth } from "@clerk/nextjs/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch relevant data from Supabase
    const [journalEntries, tasks] = await Promise.all([
      getJournalEntries(userId, 100), // Last 100 entries to catch recent XP
      getTasks(userId)
    ]);

    // Calculate Todays XP from Journal
    const todaysEntries = journalEntries.filter(entry => {
      const entryDate = new Date(entry.created_at);
      return entryDate >= today;
    });

    const xpTodayJournal = todaysEntries.reduce((sum, entry) => sum + (entry.xp_awarded || 0), 0);
    const xpTotalJournal = journalEntries.reduce((sum, entry) => sum + (entry.xp_awarded || 0), 0);

    // Calculate Todays XP from Tasks
    const todaysTasks = tasks.filter(task => {
      if (!task.completed_at) return false;
      const completedDate = new Date(task.completed_at);
      return completedDate >= today;
    });

    const xpTodayTasks = todaysTasks.reduce((sum, task) => sum + (task.xp || 0), 0);
    const xpTotalTasks = tasks.reduce((sum, task) => sum + (task.xp || 0), 0);

    const xpToday = xpTodayJournal + xpTodayTasks;
    const xpTotal = xpTotalJournal + xpTotalTasks;

    const breakdown: Record<string, number> = {};

    // Process entries categories
    todaysEntries.forEach(entry => {
      const category = entry.tags?.[0] || 'General';
      breakdown[category] = (breakdown[category] || 0) + (entry.xp_awarded || 0);
    });

    // Process tasks categories
    if (xpTodayTasks > 0) {
      breakdown['Tasks'] = (breakdown['Tasks'] || 0) + xpTodayTasks;
    }

    return NextResponse.json({
      ok: true,
      totalXp: xpToday, // Using today's XP as the primary metric for the summary
      totalXpAllTime: xpTotal,
      breakdown,
      recentEntries: todaysEntries.slice(0, 5).map(e => ({
        title: e.title,
        xp: e.xp_awarded,
        category: e.tags?.[0] || 'General'
      }))
    });
  } catch (error) {
    console.error('[XP Summary] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
