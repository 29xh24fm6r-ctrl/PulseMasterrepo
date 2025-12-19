// app/api/tasks/push/route.ts
// Legacy endpoint - kept for backward compatibility with existing widgets
// Maps legacy format to canonical /api/tasks schema
import { NextRequest, NextResponse } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolvePulseUserUuidFromClerk } from "@/lib/auth/resolvePulseUserUuid";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const clerkUserId = await requireClerkUserId();
    const pulseUserUuid = await resolvePulseUserUuidFromClerk(clerkUserId);
    const body = await req.json();
    const { id, name, description, status, priority, dueDate, project, xp } = body;

    // Map legacy status to canonical status
    const dbStatus = status === 'Done' ? 'done' : status === 'In Progress' ? 'in_progress' : 'open';
    const dbPriority = priority === 'High' ? 1 : priority === 'Low' ? 3 : 2;

    if (id) {
      // Update existing task
      const updatePayload: any = {
        title: name || undefined, // Map name to title
        notes: description || undefined, // Map description to notes
        status: dbStatus,
        priority: dbPriority,
        due_date: dueDate || undefined,
      };

      // Remove undefined fields
      Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key] === undefined) delete updatePayload[key];
      });

      const { data, error } = await supabaseAdmin
        .from("tasks")
        .update(updatePayload)
        .eq("id", id)
        .eq("user_id", pulseUserUuid)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ ok: true, task: data });
    } else {
      // Create new task
      if (!name) {
        return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from("tasks")
        .insert({
          user_id: pulseUserUuid,
          title: name, // Map name to title
          notes: description || null, // Map description to notes
          status: dbStatus,
          priority: dbPriority,
          due_date: dueDate || null,
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
