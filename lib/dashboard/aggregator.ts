/**
 * Life Dashboard v3 Aggregator
 * lib/dashboard/aggregator.ts
 * 
 * Unified data aggregation for the ultimate life dashboard
 */

import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

// ============================================
// TYPES
// ============================================

export interface DashboardData {
  greeting: string;
  todayFocus: string;
  stats: DashboardStats;
  urgentItems: UrgentItem[];
  todaySchedule: ScheduleItem[];
  activeGoals: GoalProgress[];
  relationshipAlerts: RelationshipAlert[];
  recentInsights: Insight[];
  streaks: Streak[];
  weeklyProgress: WeeklyProgress;
}

export interface DashboardStats {
  pendingActions: number;
  pendingDrafts: number;
  unreadEmails: number;
  todayEvents: number;
  activeRelationships: number;
  weeklyGoalProgress: number;
  currentStreak: number;
}

export interface UrgentItem {
  id: string;
  type: "action" | "email" | "followup" | "deadline" | "relationship";
  title: string;
  description?: string;
  priority: "high" | "urgent";
  dueAt?: Date;
  url: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  type: "event" | "task" | "block";
  location?: string;
}

export interface GoalProgress {
  id: string;
  title: string;
  progress: number;
  target: number;
  unit: string;
  dueDate?: Date;
}

export interface RelationshipAlert {
  id: string;
  name: string;
  reason: string;
  healthScore: number;
  daysSinceContact: number;
}

export interface Insight {
  id: string;
  type: string;
  content: string;
  createdAt: Date;
}

export interface Streak {
  id: string;
  name: string;
  days: number;
  isActive: boolean;
  lastCompletedAt?: Date;
}

export interface WeeklyProgress {
  prioritiesCompleted: number;
  prioritiesTotal: number;
  goalsCompleted: number;
  goalsTotal: number;
  focusHours: number;
  interactionsLogged: number;
}

// ============================================
// MAIN AGGREGATOR
// ============================================

/**
 * Get complete dashboard data
 */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [
    stats,
    urgentItems,
    todaySchedule,
    activeGoals,
    relationshipAlerts,
    recentInsights,
    streaks,
    weeklyProgress,
  ] = await Promise.all([
    getStats(userId, todayStart, todayEnd),
    getUrgentItems(userId),
    getTodaySchedule(userId, todayStart, todayEnd),
    getActiveGoals(userId),
    getRelationshipAlerts(userId),
    getRecentInsights(userId),
    getStreaks(userId),
    getWeeklyProgress(userId),
  ]);

  const greeting = getGreeting(now);
  const todayFocus = await getTodayFocus(userId, stats, urgentItems);

  return {
    greeting,
    todayFocus,
    stats,
    urgentItems,
    todaySchedule,
    activeGoals,
    relationshipAlerts,
    recentInsights,
    streaks,
    weeklyProgress,
  };
}

// ============================================
// STATS
// ============================================

async function getStats(userId: string, todayStart: Date, todayEnd: Date): Promise<DashboardStats> {
  const [
    pendingActions,
    // pendingDrafts, // delegation_drafts not in schema
    unreadEmails,
    todayEvents,
    activeRelationships,
    weeklyPlan,
    streak,
  ] = await Promise.all([
    getSupabaseAdminRuntimeClient()
      .from("autonomy_actions")
      .select("*", { count: "exact", head: true })
      .eq("user_id_uuid", userId) // Updated to user_id_uuid
      .eq("status", "pending"),
    // getSupabaseAdminRuntimeClient()
    //   .from("delegation_drafts")
    //   .select("*", { count: "exact", head: true })
    //   .eq("user_id_uuid", userId)
    //   .eq("status", "pending"),
    getSupabaseAdminRuntimeClient()
      .from("email_threads")
      .select("*", { count: "exact", head: true })
      .eq("user_id_uuid", userId) // Updated to user_id_uuid
      .eq("unread", true),
    getSupabaseAdminRuntimeClient()
      .from("calendar_events_cache")
      .select("*", { count: "exact", head: true })
      .eq("user_id_uuid", userId) // Updated to user_id_uuid
      .gte("start_time", todayStart.toISOString())
      .lt("start_time", todayEnd.toISOString()),
    getSupabaseAdminRuntimeClient()
      .from("relationships")
      .select("*", { count: "exact", head: true })
      .eq("user_id_uuid", userId) // Updated to user_id_uuid
      .gte("health_score", 50),
    getSupabaseAdminRuntimeClient()
      .from("weekly_plans")
      .select("top_priorities, goals")
      .eq("user_id_uuid", userId) // Updated to user_id_uuid
      .order("week_start", { ascending: false })
      .limit(1)
      .single(),
    getSupabaseAdminRuntimeClient()
      .from("streaks")
      .select("current_count")
      .eq("user_id_uuid", userId) // Updated to user_id_uuid
      .eq("is_active", true)
      .order("current_count", { ascending: false })
      .limit(1)
      .single(),
  ]);

  const priorities = (weeklyPlan.data?.top_priorities || []) as any[];
  const goals = weeklyPlan.data?.goals || [];
  const completedPriorities = priorities.filter((p: any) => p.completed).length;
  const weeklyGoalProgress = priorities.length > 0
    ? Math.round((completedPriorities / priorities.length) * 100)
    : 0;

  return {
    pendingActions: pendingActions.count || 0,
    pendingDrafts: 0, // pendingDrafts.count || 0,
    unreadEmails: unreadEmails.count || 0,
    todayEvents: todayEvents.count || 0,
    activeRelationships: activeRelationships.count || 0,
    weeklyGoalProgress,
    currentStreak: streak.data?.current_count || 0,
  };
}

// ============================================
// URGENT ITEMS
// ============================================

// ============================================
// URGENT ITEMS
// ============================================

async function getUrgentItems(userId: string): Promise<UrgentItem[]> {
  const items: UrgentItem[] = [];
  const now = new Date();

  // Urgent autonomy actions
  // Urgent autonomy actions (Table 'autonomy_actions' missing from schema)
  /*
  const { data: urgentActions } = await getSupabaseAdminRuntimeClient()
    .from("autonomy_actions")
    .select("*")
    .eq("user_id_uuid", userId)
    .eq("status", "pending")
    .in("priority", ["high", "urgent"])
    .limit(5);

  for (const a of urgentActions || []) {
    items.push({
      id: a.id,
      type: "action",
      title: a.title,
      description: a.description,
      priority: a.priority,
      due_date:  null,
    });
  }
  */

  // Overdue follow-ups
  const { data: overdueFollowups } = await getSupabaseAdminRuntimeClient()
    .from("email_followups")
    .select("*, email_threads(*)")
    .eq("user_id_uuid", userId)
    .eq("state", "pending") // Schema has 'state', code had 'status'. Changed to state.
    // wait, schema check for email_followups showed 'state' column?
    // Step 1990: Row: { ... state: string ... }
    // Code had .eq("status", "pending")
    // I MUST use `state`.
    .lt("due_at", now.toISOString())
    .limit(5);

  for (const f of overdueFollowups || []) {
    items.push({
      id: f.id,
      type: "followup",
      title: `Follow up: ${(f.email_threads as any)?.subject || "Email"}`,
      description: f.note || undefined, // Handle null note
      priority: "high",
      dueAt: new Date(f.due_at),
      url: "/email",
    });
  }

  // Cold relationships (VIP/Key only)
  const { data: coldRelationships } = await getSupabaseAdminRuntimeClient()
    .from("relationships")
    .select("*")
    .eq("user_id_uuid", userId)
    .in("importance", ["vip", "key"])
    .lt("health_score", 30)
    .limit(3);

  for (const r of coldRelationships || []) {
    items.push({
      id: r.id,
      type: "relationship",
      title: `Reconnect with ${r.name}`,
      description: `Health score: ${r.health_score}%`,
      priority: r.importance === "vip" ? "urgent" : "high",
      url: `/relationships/${r.id}`,
    });
  }

  return items.slice(0, 10);
}

// ============================================
// SCHEDULE
// ============================================

async function getTodaySchedule(
  userId: string,
  todayStart: Date,
  todayEnd: Date
): Promise<ScheduleItem[]> {
  const { data: events } = await getSupabaseAdminRuntimeClient()
    .from("calendar_events_cache")
    .select("*")
    .eq("user_id_uuid", userId)
    .gte("start_time", todayStart.toISOString())
    .lt("start_time", todayEnd.toISOString())
    .order("start_time");

  return (events || []).map((e) => ({
    id: e.id,
    title: e.title || "Untitled",
    startTime: new Date(e.start_time),
    endTime: new Date(e.end_time),
    type: "event" as const,
    location: e.location || undefined,
  }));
}

// ============================================
// GOALS
// ============================================

async function getActiveGoals(userId: string): Promise<GoalProgress[]> {
  const { data: plan } = await getSupabaseAdminRuntimeClient()
    .from("weekly_plans")
    .select("goals")
    .eq("user_id_uuid", userId) // Updated to user_id_uuid
    .order("week_start", { ascending: false })
    .limit(1)
    .single();

  return ((plan?.goals as any[]) || []).map((g: any) => ({
    id: g.id,
    title: g.title,
    progress: g.currentValue || 0,
    target: g.targetValue || 100,
    unit: g.targetMetric || "%",
    dueDate: undefined,
  }));
}

// ============================================
// RELATIONSHIPS
// ============================================

async function getRelationshipAlerts(userId: string): Promise<RelationshipAlert[]> {
  const { data } = await getSupabaseAdminRuntimeClient()
    .from("relationships")
    .select("*")
    .eq("user_id_uuid", userId) // Updated to user_id_uuid
    .lt("health_score", 50)
    .order("health_score")
    .limit(5);

  const now = new Date();

  return (data || []).map((r) => {
    const lastContact = r.last_contact_at ? new Date(r.last_contact_at) : null;
    const daysSince = lastContact
      ? Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    return {
      id: r.id,
      name: r.name,
      reason: daysSince > 30 ? "No contact in 30+ days" : "Low engagement",
      healthScore: r.health_score ?? 0,
      daysSinceContact: daysSince,
    };
  });
}

// ============================================
// INSIGHTS
// ============================================

async function getRecentInsights(userId: string): Promise<Insight[]> {
  const { data } = await getSupabaseAdminRuntimeClient()
    .from("third_brain_insights") // Assumed user_id_uuid
    .select("*")
    .eq("user_id_uuid", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  return (data || []).map((i) => ({
    id: i.id,
    type: i.kind, // Map kind -> type
    content: i.description, // Map description -> content
    createdAt: new Date(i.created_at),
  }));
}

// ============================================
// STREAKS
// ============================================

async function getStreaks(userId: string): Promise<Streak[]> {
  const { data } = await getSupabaseAdminRuntimeClient()
    .from("streaks")
    .select("*")
    .eq("user_id_uuid", userId) // Updated to user_id_uuid
    .order("current_count", { ascending: false })
    .limit(5);

  return (data || []).map((s) => ({
    id: s.id,
    name: s.streak_type,
    days: s.current_count || 0,
    isActive: !!s.last_activity_date && new Date(s.last_activity_date) >= new Date(Date.now() - 86400000 * 2), // ~2 days active
    lastCompletedAt: s.last_activity_date ? new Date(s.last_activity_date) : undefined,
  }));
}

// ============================================
// WEEKLY PROGRESS
// ============================================

async function getWeeklyProgress(userId: string): Promise<WeeklyProgress> {
  const { data: plan } = await getSupabaseAdminRuntimeClient()
    .from("weekly_plans")
    .select("*")
    .eq("user_id_uuid", userId) // Updated to user_id_uuid
    .order("week_start", { ascending: false })
    .limit(1)
    .single();

  const priorities = (plan?.top_priorities as any[]) || [];
  const goals = (plan?.goals as any[]) || [];

  // Count interactions this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const { count: interactions } = await getSupabaseAdminRuntimeClient()
    .from("relationship_interactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id_uuid", userId) // Updated to user_id_uuid
    .gte("occurred_at", weekStart.toISOString());

  return {
    prioritiesCompleted: priorities.filter((p: any) => p.completed).length,
    prioritiesTotal: priorities.length,
    goalsCompleted: goals.filter((g: any) => g.completed).length,
    goalsTotal: goals.length,
    focusHours: 0, // TODO: Track from time blocks
    interactionsLogged: interactions || 0,
  };
}

// ============================================
// HELPERS
// ============================================

function getGreeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

async function getTodayFocus(
  userId: string,
  stats: DashboardStats,
  urgentItems: UrgentItem[]
): Promise<string> {
  if (urgentItems.length > 0) {
    return `${urgentItems.length} urgent item${urgentItems.length > 1 ? "s" : ""} need attention`;
  }
  if (stats.todayEvents > 0) {
    return `${stats.todayEvents} event${stats.todayEvents > 1 ? "s" : ""} on your calendar`;
  }
  if (stats.pendingActions > 0) {
    return `${stats.pendingActions} action${stats.pendingActions > 1 ? "s" : ""} waiting for you`;
  }
  return "Clear schedule - focus on your priorities";
}