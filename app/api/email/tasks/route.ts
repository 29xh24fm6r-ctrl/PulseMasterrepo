// Email Tasks API
// app/api/email/tasks/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "open";
    const dueBefore = url.searchParams.get("dueBefore");
    const dueAfter = url.searchParams.get("dueAfter");

    let query = supabaseAdmin
      .from("email_tasks")
      .select("*, email_threads(subject, last_from)")
      .eq("user_id", dbUserId)
      .eq("status", status)
      .order("due_at", { ascending: true, nullsLast: true })
      .order("priority", { ascending: false });

    if (dueBefore) {
      query = query.lte("due_at", dueBefore);
    }
    if (dueAfter) {
      query = query.gte("due_at", dueAfter);
    }

    const { data: tasks } = await query;

    return NextResponse.json({
      tasks: (tasks || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        dueAt: t.due_at,
        priority: t.priority,
        status: t.status,
        threadSubject: t.email_threads?.subject,
        threadFrom: t.email_threads?.last_from,
      })),
    });
  } catch (err: any) {
    console.error("[EmailTasks] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get email tasks" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    const body = await req.json();
    const { taskId, status, priority, dueAt } = body;

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (dueAt) updates.due_at = dueAt;

    const { data: task } = await supabaseAdmin
      .from("email_tasks")
      .update(updates)
      .eq("id", taskId)
      .eq("user_id", dbUserId)
      .select()
      .single();

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (err: any) {
    console.error("[EmailTasks] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update task" },
      { status: 500 }
    );
  }
}

