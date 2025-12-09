import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const XP_LOG_DB = process.env.XP_LOG_DB || "";

// Activity XP mapping
const ACTIVITY_XP_MAP: Record<string, { amount: number; category: string }> = {
  habit_completed: { amount: 15, category: "DXP" },
  task_completed: { amount: 25, category: "DXP" },
  task_completed_high_priority: { amount: 40, category: "DXP" },
  journal_entry: { amount: 20, category: "DXP" },
  follow_up_sent: { amount: 20, category: "DXP" },
  morning_routine: { amount: 30, category: "DXP" },
  deal_won: { amount: 150, category: "AXP" },
  deal_advanced: { amount: 50, category: "AXP" },
  streak_milestone_7: { amount: 50, category: "MXP" },
  streak_milestone_14: { amount: 100, category: "MXP" },
  streak_milestone_30: { amount: 200, category: "MXP" },
  streak_milestone_60: { amount: 300, category: "MXP" },
  streak_milestone_90: { amount: 500, category: "MXP" },
  streak_milestone_100: { amount: 750, category: "MXP" },
  stoic_moment: { amount: 30, category: "IXP" },
  boundary_set: { amount: 40, category: "PXP" },
  difficult_conversation: { amount: 50, category: "PXP" },
  // Philosophy Dojo - Mentor Sessions
  mentor_session_started: { amount: 15, category: "IXP" },
  mentor_insight_received: { amount: 25, category: "IXP" },
  mentor_deep_conversation: { amount: 40, category: "IXP" },
  // Philosophy Dojo - Training
  philosophy_training_completed: { amount: 35, category: "IXP" },
  philosophy_skill_unlocked: { amount: 50, category: "IXP" },
};

// Calculate if this is a crit (random chance)
function rollForCrit(): { wasCrit: boolean; multiplier: number } {
  const roll = Math.random();
  if (roll < 0.05) return { wasCrit: true, multiplier: 4 };
  if (roll < 0.15) return { wasCrit: true, multiplier: 3 };
  if (roll < 0.30) return { wasCrit: true, multiplier: 2 };
  return { wasCrit: false, multiplier: 1 };
}

export async function awardXP(
  activity: string,
  sourceType: string,
  options: {
    sourceId?: string;
    notes?: string;
    forceCrit?: boolean;
    customMultiplier?: number;
  } = {}
): Promise<{
  amount: number;
  category: string;
  wasCrit: boolean;
  critMultiplier: number;
  activity: string;
}> {
  const activityConfig = ACTIVITY_XP_MAP[activity];
  if (!activityConfig) {
    console.warn(`Unknown activity: ${activity}`);
    return { amount: 0, category: "DXP", wasCrit: false, critMultiplier: 1, activity };
  }

  const { wasCrit, multiplier } = options.forceCrit
    ? { wasCrit: true, multiplier: options.customMultiplier || 2 }
    : rollForCrit();

  const finalAmount = Math.round(activityConfig.amount * multiplier);

  if (XP_LOG_DB) {
    try {
      const properties: Record<string, any> = {
        'Activity': { title: [{ text: { content: activity } }] },
        'Amount': { number: finalAmount },
        'Category': { select: { name: activityConfig.category } },
        'Date': { date: { start: new Date().toISOString() } },
        'Was Crit': { checkbox: wasCrit },
        'Base Amount': { number: activityConfig.amount },
        'Source Type': { select: { name: sourceType } },
      };

      if (options.sourceId) {
        properties['Source ID'] = { rich_text: [{ text: { content: options.sourceId } }] };
      }
      if (options.notes) {
        properties['Notes'] = { rich_text: [{ text: { content: options.notes } }] };
      }
      properties['Identity Bonus'] = { number: 0 };

      await notion.pages.create({
        parent: { database_id: XP_LOG_DB },
        properties,
      });

      console.log(`✅ XP Logged: +${finalAmount} ${activityConfig.category} for ${activity}${wasCrit ? ' (CRIT!)' : ''}`);
    } catch (notionError: any) {
      console.error("XP logging to Notion failed:", notionError.message);
    }
  }

  return {
    amount: finalAmount,
    category: activityConfig.category,
    wasCrit,
    critMultiplier: multiplier,
    activity,
  };
}

export async function awardHabitXP(habitId: string, habitName: string) {
  return awardXP("habit_completed", "habit", { sourceId: habitId, notes: habitName });
}

export async function awardTaskXP(taskId: string, priority: string, taskName: string) {
  const activity = priority === "High" || priority === "🔴 High" ? "task_completed_high_priority" : "task_completed";
  return awardXP(activity, "task", { sourceId: taskId, notes: taskName });
}

export async function awardJournalXP(journalId: string) {
  return awardXP("journal_entry", "journal", { sourceId: journalId });
}

export async function awardFollowUpXP(followUpId: string, contactName: string) {
  return awardXP("follow_up_sent", "follow_up", { sourceId: followUpId, notes: contactName });
}

export async function awardDealWonXP(dealId: string, dealName: string) {
  return awardXP("deal_won", "deal", { sourceId: dealId, notes: dealName });
}

export async function awardDealAdvancedXP(dealId: string, dealName: string) {
  return awardXP("deal_advanced", "deal", { sourceId: dealId, notes: dealName });
}

export async function awardStreakXP(streakDays: number) {
  const milestoneActivities: Record<number, string> = {
    7: "streak_milestone_7",
    14: "streak_milestone_14",
    30: "streak_milestone_30",
    60: "streak_milestone_60",
    90: "streak_milestone_90",
    100: "streak_milestone_100",
  };
  const activity = milestoneActivities[streakDays];
  if (!activity) {
    return { amount: 0, category: "MXP", wasCrit: false, critMultiplier: 1, activity: "none" };
  }
  return awardXP(activity, "streak", { notes: `${streakDays}-day streak milestone!`, forceCrit: true, customMultiplier: 1 });
}

export async function awardMorningRoutineXP() {
  return awardXP("morning_routine", "routine", { notes: "Morning routine completed" });
}

export async function awardMentorXP(mentorName: string, activity: 'started' | 'insight' | 'deep') {
  const activityMap = { started: 'mentor_session_started', insight: 'mentor_insight_received', deep: 'mentor_deep_conversation' };
  return awardXP(activityMap[activity], "mentor_session", { notes: `${mentorName} session` });
}

export async function getXPTotals(period: "today" | "week" | "month" | "all" = "all") {
  if (!XP_LOG_DB) return { totals: {}, recentGains: [] };

  try {
    let dateFilter: any = undefined;
    const now = new Date();
    
    if (period === "today") {
      dateFilter = { property: "Date", date: { equals: now.toISOString().split("T")[0] } };
    } else if (period === "week") {
      dateFilter = { property: "Date", date: { after: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() } };
    } else if (period === "month") {
      dateFilter = { property: "Date", date: { after: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() } };
    }

    const response = await notion.databases.query({
      database_id: XP_LOG_DB,
      filter: dateFilter,
      sorts: [{ property: "Date", direction: "descending" }],
      page_size: 100,
    });

    const totals: Record<string, number> = { DXP: 0, PXP: 0, IXP: 0, AXP: 0, MXP: 0 };
    const recentGains: any[] = [];

    for (const page of response.results as any[]) {
      const props = page.properties;
      const amount = props.Amount?.number || 0;
      const category = props.Category?.select?.name || "DXP";
      const activity = props.Activity?.title?.[0]?.plain_text || "Unknown";
      const wasCrit = props['Was Crit']?.checkbox || false;

      if (totals[category] !== undefined) totals[category] += amount;
      if (recentGains.length < 10) {
        recentGains.push({ activity, amount, category, date: props.Date?.date?.start, wasCrit });
      }
    }

    return { totals, recentGains };
  } catch (error) {
    console.error("Failed to get XP totals:", error);
    return { totals: {}, recentGains: [] };
  }
}
