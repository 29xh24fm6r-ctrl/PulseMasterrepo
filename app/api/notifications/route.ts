import { NextRequest, NextResponse } from "next/server";
import { getAutonomyStatus, filterInsightsByAutonomy, type AutonomySettings } from "@/lib/autonomy-behavior";
import { Client } from "@notionhq/client";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const TASKS_DB = process.env.NOTION_DATABASE_TASKS;
const FOLLOW_UPS_DB = process.env.NOTION_DATABASE_FOLLOW_UPS;

if (!NOTION_API_KEY) throw new Error("Missing NOTION_API_KEY");

const notion = new Client({ auth: NOTION_API_KEY });

function normalizeDatabaseId(id: string): string {
  return id.replace(/-/g, "");
}

type Notification = {
  id: string;
  type: "overdue" | "due_today" | "high_priority" | "follow_up";
  title: string;
  message: string;
  priority: "urgent" | "high" | "normal";
  source: "tasks" | "follow-ups";
  dueDate?: string;
  createdAt: string;
};

// ============================================
// GET: Fetch notifications
// ============================================
export async function GET(req: NextRequest) {
  try {
    const notifications: Notification[] = [];
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // ============================================
    // Check Tasks
    // ============================================
    if (TASKS_DB) {
      try {
        const tasksResponse = await notion.databases.query({
          database_id: normalizeDatabaseId(TASKS_DB),
          filter: {
            and: [
              {
                property: "Status",
                select: {  // FIXED: was "status", now "select"
                  does_not_equal: "Done",
                },
              },
            ],
          },
          page_size: 100,
        });

        for (const page of tasksResponse.results) {
          const props = (page as any).properties;
          const name = props.Name?.title?.[0]?.plain_text || "Untitled Task";
          const dueDate = props["Due Date"]?.date?.start || props.Due?.date?.start || null;
          const priority = props.Priority?.select?.name || "Normal";
          const status = props.Status?.select?.name || "Not Started";  // FIXED: was "status", now "select"

          // Skip completed
          if (status === "Done" || status === "Completed") continue;

          // Check if overdue
          if (dueDate && dueDate < today) {
            const daysOverdue = Math.floor((now.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
            notifications.push({
              id: (page as any).id,
              type: "overdue",
              title: `⚠️ Overdue: ${name}`,
              message: `This task is ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue!`,
              priority: "urgent",
              source: "tasks",
              dueDate,
              createdAt: now.toISOString(),
            });
          }
          // Check if due today
          else if (dueDate === today) {
            notifications.push({
              id: (page as any).id,
              type: "due_today",
              title: `📅 Due Today: ${name}`,
              message: "This task is due today!",
              priority: "high",
              source: "tasks",
              dueDate,
              createdAt: now.toISOString(),
            });
          }
          // Check high priority
          else if (priority === "High" || priority === "Urgent") {
            notifications.push({
              id: (page as any).id,
              type: "high_priority",
              title: `🔥 High Priority: ${name}`,
              message: `This is a ${priority.toLowerCase()} priority task`,
              priority: priority === "Urgent" ? "urgent" : "high",
              source: "tasks",
              dueDate,
              createdAt: now.toISOString(),
            });
          }
        }
      } catch (err) {
        console.error("Error fetching tasks:", err);
      }
    }

    // ============================================
    // Check Follow-Ups
    // ============================================
    if (FOLLOW_UPS_DB) {
      try {
        const followUpsResponse = await notion.databases.query({
          database_id: normalizeDatabaseId(FOLLOW_UPS_DB),
          filter: {
            and: [
              {
                property: "Status",
                select: {
                  does_not_equal: "Sent",
                },
              },
              {
                property: "Status",
                select: {
                  does_not_equal: "Responded",
                },
              },
            ],
          },
          page_size: 100,
        });

        for (const page of followUpsResponse.results) {
          const props = (page as any).properties;
          const name = props.Name?.title?.[0]?.plain_text || "Untitled Follow-Up";
          const dueDate = props["Due Date"]?.date?.start || props["Follow-Up Date"]?.date?.start || null;
          const status = props.Status?.select?.name || "Pending";

          // Skip sent/responded
          if (status === "Sent" || status === "Responded") continue;

          // Check if overdue
          if (dueDate && dueDate < today) {
            const daysOverdue = Math.floor((now.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
            notifications.push({
              id: (page as any).id,
              type: "overdue",
              title: `⚠️ Overdue Follow-Up: ${name}`,
              message: `This follow-up is ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue!`,
              priority: "urgent",
              source: "follow-ups",
              dueDate,
              createdAt: now.toISOString(),
            });
          }
          // Check if due today
          else if (dueDate === today) {
            notifications.push({
              id: (page as any).id,
              type: "due_today",
              title: `📅 Follow-Up Due: ${name}`,
              message: "This follow-up is due today!",
              priority: "high",
              source: "follow-ups",
              dueDate,
              createdAt: now.toISOString(),
            });
          }
        }
      } catch (err) {
        console.error("Error fetching follow-ups:", err);
      }
    }

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, normal: 2 };
    notifications.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Summary stats
    const stats = {
      total: notifications.length,
      urgent: notifications.filter((n) => n.priority === "urgent").length,
      high: notifications.filter((n) => n.priority === "high").length,
      overdue: notifications.filter((n) => n.type === "overdue").length,
      dueToday: notifications.filter((n) => n.type === "due_today").length,
    };

    return NextResponse.json({
      ok: true,
      notifications,
      stats,
      checkedAt: now.toISOString(),
    });
  } catch (err: any) {
    console.error("Notifications error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
// ============================================
// POST: Notifications with autonomy settings
// ============================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const settings: AutonomySettings | null = body.settings || null;
    
    const autonomyStatus = getAutonomyStatus(settings);
    
    // Zen mode = no notifications
    if (autonomyStatus.level === "zen") {
      return NextResponse.json({
        ok: true,
        notifications: [],
        stats: { total: 0, urgent: 0, high: 0, overdue: 0, dueToday: 0 },
        suppressed: true,
        reason: "Zen mode active",
        autonomy: autonomyStatus,
        checkedAt: new Date().toISOString(),
      });
    }
    
    // Get all notifications first (reuse GET logic by calling internally)
    const response = await GET(req);
    const data = await response.json();
    
    if (!data.ok) return response;
    
    let notifications = data.notifications || [];
    
    // Quiet hours = only urgent
    if (autonomyStatus.inQuietHours) {
      notifications = notifications.filter((n: any) => n.priority === "urgent");
    }
    
    // Critical only = only urgent/high
    if (settings?.criticalOnly) {
      notifications = notifications.filter((n: any) => 
        n.priority === "urgent" || n.priority === "high"
      );
    }
    
    // Recalculate stats
    const stats = {
      total: notifications.length,
      urgent: notifications.filter((n: any) => n.priority === "urgent").length,
      high: notifications.filter((n: any) => n.priority === "high").length,
      overdue: notifications.filter((n: any) => n.type === "overdue").length,
      dueToday: notifications.filter((n: any) => n.type === "due_today").length,
    };
    
    return NextResponse.json({
      ok: true,
      notifications,
      stats,
      autonomy: autonomyStatus,
      checkedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Notifications POST error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}