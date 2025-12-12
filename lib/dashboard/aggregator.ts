/**
 * Dashboard Data Aggregator
 * Aggregates data from multiple sources for surfaces
 * lib/dashboard/aggregator.ts
 */

import { supabaseServer } from "@/lib/supabase/server";

export interface DashboardData {
  stats: {
    todayEvents: number;
    pendingActions: number;
    unreadEmails: number;
    activeRelationships: number;
  };
  todayFocus?: string;
  urgentItems?: Array<{
    id: string;
    type: string;
    title: string;
    description?: string;
    priority: "urgent" | "high" | "medium" | "low";
    url?: string;
  }>;
  relationshipAlerts?: Array<{
    name: string;
    reason: string;
  }>;
  todaySchedule?: Array<{
    id: string;
    title: string;
    startTime: string;
  }>;
  recentInsights?: Array<{
    content: string;
  }>;
}

/**
 * Get aggregated dashboard data for surfaces
 */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  const supabase = supabaseServer();

  // Get stats in parallel
  const [tasksResult, dealsResult, interactionsResult, contactsResult] = await Promise.all([
    // Pending tasks
    supabase
      .from("crm_tasks")
      .select("id, title, due_date, status")
      .eq("owner_user_id", userId)
      .eq("status", "pending"),
    // Active deals
    supabase
      .from("crm_deals")
      .select("id, name, stage, updated_at")
      .eq("owner_user_id", userId)
      .not("stage", "eq", "closed"),
    // Recent interactions
    supabase
      .from("crm_interactions")
      .select("id, type, occurred_at")
      .eq("owner_user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(50),
    // Contacts
    supabase
      .from("crm_contacts")
      .select("id")
      .eq("owner_user_id", userId)
      .limit(100),
  ]);

  const tasks = tasksResult.data || [];
  const deals = dealsResult.data || [];
  const interactions = interactionsResult.data || [];
  const contacts = contactsResult.data || [];

  // Get today's events
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: todayEvents } = await supabase
    .from("calendar_events_cache")
    .select("id, title, start_time")
    .eq("owner_user_id", userId)
    .gte("start_time", today.toISOString())
    .lt("start_time", tomorrow.toISOString());

  // Calculate stats
  const pendingTasks = tasks.length;
  const overdueTasks = tasks.filter((t) => {
    if (!t.due_date) return false;
    return new Date(t.due_date) < new Date();
  }).length;

  // Build urgent items
  const urgentItems: DashboardData["urgentItems"] = [];

  overdueTasks.forEach((task) => {
    const daysOverdue = Math.floor(
      (Date.now() - new Date(task.due_date!).getTime()) / (1000 * 60 * 60 * 24)
    );
    urgentItems.push({
      id: `task-${task.id}`,
      type: "task",
      title: task.title || "Untitled Task",
      description: `${daysOverdue} days overdue`,
      priority: daysOverdue > 3 ? "urgent" : "high",
      url: `/workspace?selected=task-${task.id}`,
    });
  });

  // Add stalled deals
  deals.forEach((deal: any) => {
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceUpdate > 7) {
      urgentItems.push({
        id: `deal-${deal.id}`,
        type: "deal",
        title: deal.name || "Untitled Deal",
        description: `Stalled for ${daysSinceUpdate} days`,
        priority: daysSinceUpdate > 14 ? "urgent" : "high",
        url: `/workspace?selected=deal-${deal.id}`,
      });
    }
  });

  // Get today focus
  const todayFocus =
    overdueTasks > 0
      ? `Clear ${overdueTasks} overdue task${overdueTasks !== 1 ? "s" : ""}`
      : pendingTasks > 0
      ? `Complete ${pendingTasks} pending task${pendingTasks !== 1 ? "s" : ""}`
      : "Keep it simple: do the highest leverage move first.";

  // Get relationship alerts
  const relationshipAlerts: DashboardData["relationshipAlerts"] = [];
  const recentContacts = new Set(
    interactions
      .filter((i) => {
        const daysSince = (Date.now() - new Date(i.occurred_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince > 14 && daysSince < 30;
      })
      .map((i) => i.contact_id || i.organization_id)
      .filter(Boolean)
  );

  if (recentContacts.size > 0) {
    relationshipAlerts.push({
      name: `${recentContacts.size} contact${recentContacts.size !== 1 ? "s" : ""}`,
      reason: "Relationship cooling - touchpoint recommended",
    });
  }

  // Get recent insights
  const { data: recentFragments } = await supabase
    .from("tb_memory_fragments")
    .select("content")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  const recentInsights = (recentFragments || []).map((f) => ({
    content: f.content?.substring(0, 200) || "",
  }));

  return {
    stats: {
      todayEvents: todayEvents?.length || 0,
      pendingActions: pendingTasks,
      unreadEmails: 0, // TODO: wire email sync
      activeRelationships: contacts.length,
    },
    todayFocus,
    urgentItems,
    relationshipAlerts,
    todaySchedule: (todayEvents || []).map((e) => ({
      id: e.id,
      title: e.title || "Untitled Event",
      startTime: e.start_time,
    })),
    recentInsights,
  };
}
