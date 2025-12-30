import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTasks } from "@/lib/data/tasks";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tasks = await getTasks(userId);
    return NextResponse.json({
      ok: true,
      tasks: tasks.map(t => ({
        id: t.id,
        name: t.title, // Map title to name for UI compatibility
        description: t.description,
        status: t.status === 'done' ? 'Done' : t.status === 'active' ? 'In Progress' : 'Todo',
        priority: t.priority,
        dueDate: t.due_at,
        project: t.project,
        xp: t.xp,
        completedAt: t.completed_at,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
