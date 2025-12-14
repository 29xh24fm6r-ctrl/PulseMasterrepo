import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status') ?? 'pending';
    const limit = Number(url.searchParams.get('limit') ?? '10');

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Build query
    let query = supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("user_id", dbUserId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    // Filter by status
    if (status === 'pending') {
      query = query.in("status", ["pending", "in_progress"]);
    } else if (status === 'completed' || status === 'done') {
      query = query.eq("status", "done");
    } else if (status !== 'all') {
      query = query.eq("status", status);
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error("[Tasks] Query error:", error);
      // Return empty tasks array instead of error to prevent page crashes
      return NextResponse.json({
        status,
        limit,
        tasks: [],
      });
    }

    return NextResponse.json({
      status,
      limit,
      tasks: (tasks || []).map(t => ({
        id: t.id,
        name: t.name || t.title,
        title: t.title || t.name,
        description: t.description,
        status: t.status === 'done' ? 'Done' : t.status === 'in_progress' ? 'In Progress' : 'Todo',
        priority: t.priority,
        dueDate: t.due_date,
        due_date: t.due_date,
        project: t.project,
        xp: t.xp,
        completedAt: t.completed_at,
        createdAt: t.created_at,
      })),
    });
  } catch (err: any) {
    console.error("[Tasks] Error:", err);
    // Return empty tasks array instead of error to prevent page crashes
    const url = new URL(req.url);
    const status = url.searchParams.get('status') ?? 'pending';
    const limit = Number(url.searchParams.get('limit') ?? '10');
    return NextResponse.json({
      status,
      limit,
      tasks: [],
    });
  }
}

