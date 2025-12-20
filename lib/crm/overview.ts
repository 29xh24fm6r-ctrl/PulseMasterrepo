import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Deal, Task, Activity, CrmOverviewData } from "./types";

// Re-export types for convenience
export type { Deal, Task, Activity, CrmOverviewData } from "./types";

const STAGES = ["prospecting", "qualified", "proposal", "underwriting", "closing", "won", "lost"];

export async function getCrmOverview(clerkUserId: string): Promise<CrmOverviewData> {
  try {
    // Resolve Clerk ID to database UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .single();

    const dbUserId = userRow?.id || clerkUserId;

    // Get all deals (including won/lost for pipeline)
    const { data: allDeals } = await supabaseAdmin
      .from("crm_deals")
      .select("id, name, stage, amount, close_date, primary_contact_id, created_at, updated_at")
      .eq("user_id", dbUserId)
      .order("updated_at", { ascending: false });

    // Get contact names for deals (only active contacts)
    const contactIds = [...new Set(allDeals?.map((d) => d.primary_contact_id).filter(Boolean) || [])];
    const { data: contacts } = contactIds.length > 0
      ? await supabaseAdmin
          .from("crm_contacts")
          .select("id, full_name")
          .in("id", contactIds)
          .eq("status", "active")
      : { data: null };

    const contactMap = new Map((contacts || []).map((c) => [c.id, c.full_name]));

    // Get task counts per deal (from crm_tasks, linked via deal_id)
    const dealIds = allDeals?.map((d) => d.id) || [];
    const { data: dealTasks } = dealIds.length > 0
      ? await supabaseAdmin
          .from("crm_tasks")
          .select("id, deal_id")
          .eq("owner_user_id", clerkUserId)
          .in("status", ["pending", "in_progress", "open"])
          .not("deal_id", "is", null)
          .in("deal_id", dealIds)
      : { data: null };

    const taskCountMap = new Map<string, number>();
    (dealTasks || []).forEach((task) => {
      if (task.deal_id && dealIds.includes(task.deal_id)) {
        taskCountMap.set(task.deal_id, (taskCountMap.get(task.deal_id) || 0) + 1);
      }
    });

    // Enrich deals with contact names and task counts, group by stage
    const dealsByStage: Record<string, Deal[]> = {};
    STAGES.forEach((stage) => {
      dealsByStage[stage] = [];
    });

    (allDeals || []).forEach((deal) => {
      const enrichedDeal: Deal = {
        ...deal,
        contact_name: deal.primary_contact_id ? contactMap.get(deal.primary_contact_id) : undefined,
        task_count: taskCountMap.get(deal.id) || 0,
      };
      const stage = deal.stage || "prospecting";
      if (dealsByStage[stage]) {
        dealsByStage[stage].push(enrichedDeal);
      } else {
        dealsByStage["prospecting"].push(enrichedDeal);
      }
    });

    // Get CRM tasks - categorize by due date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: allTasks } = await supabaseAdmin
      .from("crm_tasks")
      .select("id, title, due_at, status, priority, deal_id, contact_id")
      .eq("owner_user_id", clerkUserId)
      .in("status", ["pending", "in_progress", "open"]);

    const overdue: Task[] = [];
    const dueToday: Task[] = [];
    const dueSoon: Task[] = [];

    (allTasks || []).forEach((task) => {
      const dueAt = task.due_at;
      if (!dueAt) return; // Skip tasks without due dates

      const dueDate = new Date(dueAt);

      const taskWithDueAt: Task = {
        ...task,
        due_at: dueAt,
        deal_id: task.deal_id || undefined,
      };

      if (dueDate < today) {
        overdue.push(taskWithDueAt);
      } else if (dueDate.toDateString() === today.toDateString()) {
        dueToday.push(taskWithDueAt);
      } else if (dueDate <= sevenDaysFromNow) {
        dueSoon.push(taskWithDueAt);
      }
    });

    // Get recent activity (interactions)
    const { data: recentActivity } = await supabaseAdmin
      .from("crm_interactions")
      .select("id, type, occurred_at, subject, summary, contact_id, deal_id")
      .eq("user_id", dbUserId)
      .order("occurred_at", { ascending: false })
      .limit(20);

    const activity: Activity[] = (recentActivity || []).map((i) => ({
      id: i.id,
      type: i.type,
      body: i.summary,
      subject: i.subject,
      summary: i.summary,
      occurred_at: i.occurred_at,
      created_at: i.occurred_at,
      contact_id: i.contact_id || undefined,
      deal_id: i.deal_id || undefined,
    }));

    const openDealsCount = Object.values(dealsByStage)
      .flat()
      .filter((d) => !["won", "lost"].includes(d.stage)).length;

    return {
      ok: true,
      module: "crm",
      summary: `${openDealsCount} open deals | ${overdue.length + dueToday.length} urgent tasks | ${activity.length} recent activities`,
      pipeline: {
        stages: STAGES,
        dealsByStage,
      },
      tasks: {
        overdue: overdue.sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime()),
        dueToday: dueToday.sort((a, b) => (b.priority || 0) - (a.priority || 0)),
        dueSoon: dueSoon.sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime()),
      },
      activity,
      meta: {
        userIdUsed: dbUserId,
        clerkUserId,
      },
    };
  } catch (err) {
    console.error("[CrmOverview] Error:", err);
    return {
      ok: false,
      module: "crm",
      summary: "CRM data unavailable",
      pipeline: {
        stages: STAGES,
        dealsByStage: {},
      },
      tasks: {
        overdue: [],
        dueToday: [],
        dueSoon: [],
      },
      activity: [],
      meta: {
        userIdUsed: "",
        clerkUserId,
      },
    };
  }
}

