// Task Detector - Finds overdue or due-today tasks
// lib/autopilot/detectors/tasks.ts

import { supabaseAdmin } from "@/lib/supabase";
import { AutopilotCandidate } from "../types";

/**
 * Detect overdue or due-today tasks
 */
export async function detectTaskActions(
  userId: string
): Promise<AutopilotCandidate[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const candidates: AutopilotCandidate[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Find overdue tasks
  const { data: overdueTasks } = await supabaseAdmin
    .from("tasks")
    .select("id, title, due_at, status, priority")
    .eq("user_id", dbUserId)
    .in("status", ["open", "in_progress"])
    .lt("due_at", today.toISOString())
    .order("due_at", { ascending: true })
    .limit(20);

  for (const task of overdueTasks || []) {
    const daysOverdue = Math.floor(
      (now.getTime() - new Date(task.due_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    let riskLevel: "low" | "medium" | "high" = "low";
    if (daysOverdue > 7 || task.priority === "high" || task.priority === "critical") {
      riskLevel = "high";
    } else if (daysOverdue > 3 || task.priority === "medium") {
      riskLevel = "medium";
    }

    candidates.push({
      type: "create_task", // Actually, this is a reminder to complete existing task
      riskLevel,
      context: {
        task_id: task.id,
        title: task.title,
        due_at: task.due_at,
        days_overdue: daysOverdue,
        priority: task.priority,
      },
      summary: `Overdue task: ${task.title} (${daysOverdue} days overdue)`,
    });
  }

  // Find tasks due today
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: dueTodayTasks } = await supabaseAdmin
    .from("tasks")
    .select("id, title, due_at, status, priority")
    .eq("user_id", dbUserId)
    .in("status", ["open", "in_progress"])
    .gte("due_at", today.toISOString())
    .lt("due_at", tomorrow.toISOString())
    .limit(20);

  for (const task of dueTodayTasks || []) {
    candidates.push({
      type: "create_task",
      riskLevel: task.priority === "critical" || task.priority === "high" ? "high" : "medium",
      context: {
        task_id: task.id,
        title: task.title,
        due_at: task.due_at,
        priority: task.priority,
        due_today: true,
      },
      summary: `Task due today: ${task.title}`,
    });
  }

  return candidates;
}




