import { supabaseAdmin } from "@/lib/supabase";

const ACTIVITY_XP_MAP: Record<string, { amount: number; category: string }> = {
  habit_completed: { amount: 15, category: "MXP" }, // Fixed category to MXP based on helper
  task_completed: { amount: 25, category: "DXP" },
  task_completed_high_priority: { amount: 40, category: "DXP" },
  journal_entry: { amount: 20, category: "IXP" },
  follow_up_sent: { amount: 20, category: "PXP" },
  morning_routine: { amount: 30, category: "MXP" },
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
  mentor_session_started: { amount: 15, category: "IXP" },
  mentor_insight_received: { amount: 25, category: "IXP" },
  mentor_deep_conversation: { amount: 40, category: "IXP" },
  philosophy_training_completed: { amount: 35, category: "IXP" },
  philosophy_skill_unlocked: { amount: 50, category: "IXP" },
};

function rollForCrit(): { wasCrit: boolean; multiplier: number } {
  const roll = Math.random();
  if (roll < 0.05) return { wasCrit: true, multiplier: 4 };
  if (roll < 0.15) return { wasCrit: true, multiplier: 3 };
  if (roll < 0.30) return { wasCrit: true, multiplier: 2 };
  return { wasCrit: false, multiplier: 1 };
}

export async function awardXP(
  userId: string,
  activity: string,
  sourceType: string,
  options: {
    sourceId?: string;
    notes?: string;
    forceCrit?: boolean;
    customMultiplier?: number;
  } = {}
) {
  const activityConfig = ACTIVITY_XP_MAP[activity];
  if (!activityConfig) {
    console.warn(`Unknown activity: ${activity}`);
    // Default fallback
    return { amount: 0, category: 'DXP', wasCrit: false };
  }

  const { wasCrit, multiplier } = options.forceCrit
    ? { wasCrit: true, multiplier: options.customMultiplier || 2 }
    : rollForCrit();

  const finalAmount = Math.round(activityConfig.amount * multiplier);

  try {
    await supabaseAdmin.from("xp_transactions").insert({
      user_id_uuid: userId,
      owner_user_id_legacy: userId, // Legacy field
      amount: finalAmount,
      // Map category/activity/notes to reason since schema is limited
      reason: `${activity} (${activityConfig.category})${options.notes ? `: ${options.notes}` : ''}`,
      source_type: sourceType,
      source_id: options.sourceId || null,
    });
  } catch (error) {
    console.error("Failed to log XP:", error);
  }

  return {
    amount: finalAmount,
    category: activityConfig.category,
    wasCrit,
    critMultiplier: multiplier,
    activity,
  };
}

// typed helpers
export async function awardHabitXP(userId: string, habitId: string, habitName: string) {
  return awardXP(userId, "habit_completed", "habit", { sourceId: habitId, notes: habitName });
}

export async function awardTaskXP(userId: string, taskId: string, priority: string, taskName: string) {
  const activity = priority === "High" || priority === "🔴 High" ? "task_completed_high_priority" : "task_completed";
  return awardXP(userId, activity, "task", { sourceId: taskId, notes: taskName });
}

export async function awardJournalXP(userId: string, journalId: string) {
  return awardXP(userId, "journal_entry", "journal", { sourceId: journalId });
}

export async function awardDealWonXP(userId: string, dealId: string, dealName: string) {
  return awardXP(userId, "deal_won", "deal", { sourceId: dealId, notes: dealName });
}

export async function awardDealAdvancedXP(userId: string, dealId: string, dealName: string) {
  return awardXP(userId, "deal_advanced", "deal", { sourceId: dealId, notes: dealName });
}

export async function getXPTotals(userId: string, period: "today" | "week" | "month" | "all" = "all") {
  let query = supabaseAdmin.from("xp_transactions").select("*").eq("user_id_uuid", userId);

  const now = new Date();
  if (period === "today") {
    query = query.gte("created_at", new Date(now.setHours(0, 0, 0, 0)).toISOString());
  } else if (period === "week") {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    query = query.gte("created_at", weekAgo.toISOString());
  }

  const { data, error } = await query;
  if (error) return { totals: {}, recentGains: [] };

  const totals: Record<string, number> = { DXP: 0, PXP: 0, IXP: 0, AXP: 0, MXP: 0 };

  data.forEach((log: any) => {
    // Attempt to extract category from reason: "Activity Name (DXP)"
    const match = log.reason?.match(/\((DXP|PXP|IXP|AXP|MXP)\)/);
    const category = match ? match[1] : "AXP"; // Default to AXP if not found

    if (totals[category] !== undefined) {
      totals[category] += (log.amount || 0);
    }
  });

  // Sort desc by created_at (handling nulls)
  const sorted = data.sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  return { totals, recentGains: sorted.slice(0, 10) };
}
