// Life Arc Autopilot Integration Helpers
// lib/life-arc/autopilot/integration.ts

import { supabaseAdmin } from "@/lib/supabase";

export interface WeeklyObjectiveSummary {
  summary: string;
  targetQuests: number;
}

export interface DailyFocusSummary {
  title: string;
  arcName?: string;
}

/**
 * Get weekly objectives for user (for context injection)
 */
export async function getWeeklyObjectives(userId: string): Promise<WeeklyObjectiveSummary[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (!userRow) return [];

  const dbUserId = userRow.id;

  // Get current week start
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  const weekStart = monday.toISOString().split("T")[0];

  const { data: objectives } = await supabaseAdmin
    .from("life_arc_objectives")
    .select("summary, target_quests")
    .eq("user_id", dbUserId)
    .eq("week_start_date", weekStart);

  if (!objectives) return [];

  return objectives.map((obj) => ({
    summary: obj.summary,
    targetQuests: obj.target_quests,
  }));
}

/**
 * Get daily focus for user (for context injection)
 */
export async function getDailyFocus(userId: string): Promise<DailyFocusSummary[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (!userRow) return [];

  const dbUserId = userRow.id;

  const today = new Date().toISOString().split("T")[0];

  const { data: focusItems } = await supabaseAdmin
    .from("life_arc_daily_focus")
    .select("life_arc_quests(title), life_arcs(name)")
    .eq("user_id", dbUserId)
    .eq("focus_date", today)
    .in("status", ["planned", "in_progress"]);

  if (!focusItems) return [];

  return focusItems.map((item) => ({
    title: (item.life_arc_quests as any)?.title || "Focus item",
    arcName: (item.life_arcs as any)?.name,
  }));
}




