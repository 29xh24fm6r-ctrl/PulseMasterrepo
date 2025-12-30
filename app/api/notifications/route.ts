import { NextRequest, NextResponse } from "next/server";
import { getAutonomyStatus, type AutonomySettings } from "@/lib/autonomy-behavior";
import { getTasks } from "@/lib/data/tasks";
import { getFollowUps } from "@/lib/data/followups";
import { auth } from "@clerk/nextjs/server";

export const dynamic = 'force-dynamic';

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
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const notifications: Notification[] = [];
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Check Tasks
    try {
      const tasks = await getTasks(userId);

      for (const task of tasks) {
        if (task.status === 'done' || task.status === 'completed') continue;

        const dueDate = task.due_at?.split('T')[0] || null;
        const priority = task.priority || "Normal";

        // Check overdue
        if (dueDate && dueDate < today) {
          const daysOverdue = Math.floor((now.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
          notifications.push({
            id: task.id,
            type: "overdue",
            title: `⚠️ Overdue: ${task.title}`,
            message: `This task is ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue!`,
            priority: "urgent",
            source: "tasks",
            dueDate,
            createdAt: now.toISOString(),
          });
        } else if (dueDate === today) {
          notifications.push({
            id: task.id,
            type: "due_today",
            title: `📅 Due Today: ${task.title}`,
            message: "This task is due today!",
            priority: "high",
            source: "tasks",
            dueDate,
            createdAt: now.toISOString(),
          });
        } else if (priority === "High" || priority === "Urgent") {
          notifications.push({
            id: task.id,
            type: "high_priority",
            title: `🔥 High Priority: ${task.title}`,
            message: `This is a ${priority.toLowerCase()} priority task`,
            priority: priority === "Urgent" ? "urgent" : "high",
            source: "tasks",
            dueDate: dueDate || undefined,
            createdAt: now.toISOString(),
          });
        }
      }
    } catch (err) {
      console.error("Error fetching tasks for notifications:", err);
    }

    // Check Follow-Ups
    try {
      const followUps = await getFollowUps(userId);

      for (const f of followUps) {
        if (f.status === 'sent' || f.status === 'responded') continue;
        const dueDate = f.due_date?.split('T')[0] || null;

        if (dueDate && dueDate < today) {
          const daysOverdue = Math.floor((now.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
          notifications.push({
            id: f.id,
            type: "overdue",
            title: `⚠️ Overdue Follow-Up: ${f.name}`,
            message: `This follow-up is ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue!`,
            priority: "urgent",
            source: "follow-ups",
            dueDate,
            createdAt: now.toISOString(),
          });
        } else if (dueDate === today) {
          notifications.push({
            id: f.id,
            type: "due_today",
            title: `📅 Follow-Up Due: ${f.name}`,
            message: "This follow-up is due today!",
            priority: "high",
            source: "follow-ups",
            dueDate,
            createdAt: now.toISOString(),
          });
        }
      }
    } catch (err) {
      console.error("Error fetching follow-ups for notifications:", err);
    }

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, normal: 2 };
    notifications.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const settings: AutonomySettings | null = body.settings || null;

    const autonomyStatus = getAutonomyStatus(settings);

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

    const response = await GET(req);
    const data = await response.json();

    if (!data.ok) return response;

    let notifications = data.notifications || [];

    if (autonomyStatus.inQuietHours) {
      notifications = notifications.filter((n: any) => n.priority === "urgent");
    }

    if (settings?.criticalOnly) {
      notifications = notifications.filter((n: any) =>
        n.priority === "urgent" || n.priority === "high"
      );
    }

    const stats = {
      total: notifications.length,
      urgent: notifications.filter((n: any) => n.priority === "urgent").length,
      high: notifications.filter((n: any) => n.priority === "high").length,
      overdue: notifications.filter((n: any) => n.type === "overdue").length,
      dueToday: notifications.filter((n) => n.type === "due_today").length,
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