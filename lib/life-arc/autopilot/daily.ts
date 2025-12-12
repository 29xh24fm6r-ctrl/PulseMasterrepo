// Daily Life Arc Autopilot
// lib/life-arc/autopilot/daily.ts

import { supabaseAdmin } from "@/lib/supabase";
import { getLifeArcPlan } from "../planner";

export interface DailyFocusItem {
  arcId: string;
  questId?: string;
  autopilotActionId?: string;
}

export interface DailyAutopilotResult {
  date: string;
  items: DailyFocusItem[];
}

/**
 * Run daily life arc autopilot
 */
export async function runDailyLifeArcAutopilot(
  userId: string,
  date?: string
): Promise<DailyAutopilotResult> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Determine date
  const focusDate = date || new Date().toISOString().split("T")[0];

  // Get life arc plan
  const plan = await getLifeArcPlan(userId);

  if (plan.arcs.length === 0) {
    return { date: focusDate, items: [] };
  }

  // Get weekly objectives for context
  const weekStart = getWeekStartDate(new Date(focusDate));
  const { data: objectives } = await supabaseAdmin
    .from("life_arc_objectives")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("week_start_date", weekStart);

  // Collect all open quests with priority weighting
  const candidateItems: Array<{
    arcId: string;
    questId: string;
    priority: number;
    impact: number;
    dueDate?: string;
    daysUntilDue?: number;
  }> = [];

  for (const arc of plan.arcs) {
    const arcQuests = plan.questsByArc[arc.id] || [];
    const openQuests = arcQuests.filter((q) => q.status === "open" || q.status === "in_progress");

    const arcObjective = objectives?.find((o) => o.arc_id === arc.id);

    for (const quest of openQuests) {
      // Calculate priority score
      let priorityScore = arc.priority * 10; // Base priority from arc

      // Boost if high impact
      priorityScore += quest.impact * 2;

      // Boost if due soon
      if (quest.dueDate) {
        const due = new Date(quest.dueDate);
        const today = new Date(focusDate);
        const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilDue <= 3) {
          priorityScore += 10; // Urgent
        } else if (daysUntilDue <= 7) {
          priorityScore += 5; // Soon
        }
      }

      // Boost if arc has weekly objective
      if (arcObjective) {
        priorityScore += 5;
      }

      candidateItems.push({
        arcId: arc.id,
        questId: quest.id,
        priority: priorityScore,
        impact: quest.impact,
        dueDate: quest.dueDate,
        daysUntilDue: quest.dueDate
          ? Math.ceil((new Date(quest.dueDate).getTime() - new Date(focusDate).getTime()) / (1000 * 60 * 60 * 24))
          : undefined,
      });
    }
  }

  // Sort by priority and select top 3-7
  candidateItems.sort((a, b) => b.priority - a.priority);

  // Ensure top priority arc gets at least 1 item
  const selectedItems: DailyFocusItem[] = [];
  const focusArc = plan.focusArc;
  if (focusArc) {
    const focusArcItem = candidateItems.find((item) => item.arcId === focusArc.id);
    if (focusArcItem) {
      selectedItems.push({
        arcId: focusArcItem.arcId,
        questId: focusArcItem.questId,
      });
    }
  }

  // Fill remaining slots (target 5 items, range 3-7)
  const targetCount = 5;
  for (const item of candidateItems) {
    if (selectedItems.length >= targetCount) break;
    if (selectedItems.find((s) => s.questId === item.questId)) continue; // Already selected
    selectedItems.push({
      arcId: item.arcId,
      questId: item.questId,
    });
  }

  // Save to database
  for (const item of selectedItems) {
    await supabaseAdmin.from("life_arc_daily_focus").upsert(
      {
        user_id: dbUserId,
        focus_date: focusDate,
        arc_id: item.arcId,
        quest_id: item.questId || null,
        autopilot_action_id: item.autopilotActionId || null,
        status: "planned",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,focus_date,arc_id,quest_id",
      }
    );
  }

  return {
    date: focusDate,
    items: selectedItems,
  };
}

/**
 * Get week start date (Monday)
 */
function getWeekStartDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
}




