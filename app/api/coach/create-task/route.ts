import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createTask } from "@/lib/data/tasks";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { dealId, dealName, note } = body;

    if (!dealName || !note) {
      return NextResponse.json({ ok: false, error: "Missing dealName or note" }, { status: 400 });
    }

    const taskName = `Coach: Follow up on ${dealName}`;

    await createTask(userId, {
      title: taskName,
      status: 'pending',
      priority: 'Medium',
      description: note,
      xp: 10
    });

    return NextResponse.json({
      ok: true,
      message: "Task created successfully"
    });
  } catch (err: any) {
    console.error("Coach create-task error:", err?.message ?? err);
    return NextResponse.json({ ok: false, error: "Failed to create task" }, { status: 500 });
  }
}
