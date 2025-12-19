// app/api/tasks/pull/route.ts
// Legacy endpoint - redirects to canonical /api/tasks
// Kept for backward compatibility with existing widgets
import { NextResponse } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolvePulseUserUuidFromClerk } from "@/lib/auth/resolvePulseUserUuid";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clerkUserId = await requireClerkUserId();
    const pulseUserUuid = await resolvePulseUserUuidFromClerk(clerkUserId);

    const { data: tasks, error } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("user_id", pulseUserUuid)
      .order("due_date", { ascending: true, nullsLast: true })
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Map to legacy format for backward compatibility
    return NextResponse.json({
      ok: true,
      tasks: (tasks || []).map((t: any) => ({
        id: t.id,
        name: t.title, // Map title to name
        description: t.notes,
        status: t.status === 'done' ? 'Done' : t.status === 'open' ? 'Todo' : t.status,
        priority: t.priority === 1 ? 'High' : t.priority === 3 ? 'Low' : 'Medium',
        dueDate: t.due_date,
        project: null,
        xp: null,
        completedAt: t.status === 'done' ? t.updated_at : null,
      })),
    });
  } catch (err: any) {
    console.error("Tasks pull error:", err?.message ?? err);
    return NextResponse.json({ ok: false, error: "Failed to pull tasks" }, { status: 500 });
  }
}
