import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      tasks: tasks.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        status: t.status === 'done' ? 'Done' : t.status === 'in_progress' ? 'In Progress' : 'Todo',
        priority: t.priority,
        dueDate: t.due_date,
        project: t.project,
        xp: t.xp,
        completedAt: t.completed_at,
      })),
    });
  } catch (err: any) {
    console.error("Tasks pull error:", err?.message ?? err);
    return NextResponse.json({ ok: false, error: "Failed to pull tasks" }, { status: 500 });
  }
}
