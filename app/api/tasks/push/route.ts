import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, description, status, priority, dueDate, project, xp } = body;

    const dbStatus = status === 'Done' ? 'done' : status === 'In Progress' ? 'in_progress' : 'todo';

    if (id) {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          name,
          description,
          status: dbStatus,
          priority: priority?.toLowerCase(),
          due_date: dueDate,
          project,
          xp,
          completed_at: dbStatus === 'done' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id_uuid", userId)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ ok: true, task: data });
    } else {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id_uuid: userId,
          name,
          description,
          status: dbStatus,
          priority: priority?.toLowerCase() || 'medium',
          due_date: dueDate,
          project,
          xp: xp || 10,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ ok: true, task: data });
    }
  } catch (err: any) {
    console.error("Tasks push error:", err?.message ?? err);
    return NextResponse.json({ ok: false, error: "Failed to save task" }, { status: 500 });
  }
}
