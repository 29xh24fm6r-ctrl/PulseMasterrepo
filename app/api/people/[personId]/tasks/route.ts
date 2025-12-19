import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { personId } = await params;
    const body = await req.json();
    const { title, due_at, priority = "med" } = body;

    // Validate input
    if (!title || typeof title !== "string" || title.length === 0) {
      return NextResponse.json({ ok: false, error: "Title is required" }, { status: 400 });
    }

    if (title.length > 500) {
      return NextResponse.json({ ok: false, error: "Title too long (max 500 chars)" }, { status: 400 });
    }

    // Validate contact exists and belongs to user
    const { data: contactRow } = await supabaseAdmin
      .from("crm_contacts")
      .select("id")
      .eq("id", personId)
      .eq("owner_user_id", clerkUserId)
      .maybeSingle();

    if (!contactRow?.id) {
      return NextResponse.json(
        { ok: false, error: "Contact not found or not accessible" },
        { status: 404 }
      );
    }

    // Map priority (string to number)
    const priorityMap: Record<string, number> = { low: 1, med: 2, high: 3 };
    const priorityValue = priorityMap[priority.toLowerCase()] || 2;

    // Convert due_at to timestamptz if provided
    let dueAtValue: string | null = null;
    if (due_at) {
      try {
        const date = new Date(due_at);
        if (!isNaN(date.getTime())) {
          dueAtValue = date.toISOString();
        }
      } catch {
        // Invalid date, leave as null
      }
    }

    // Create task in crm_tasks (canonical CRM table)
    const { data: task, error: taskError } = await supabaseAdmin
      .from("crm_tasks")
      .insert({
        owner_user_id: clerkUserId,
        contact_id: personId,
        title: title.trim(),
        status: "pending",
        priority: priorityValue,
        due_at: dueAtValue,
      })
      .select("*")
      .single();

    if (taskError) {
      console.error("[CreateCRMTask] Error:", taskError);
      return NextResponse.json({ ok: false, error: "Failed to create task" }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, task },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[CreateCRMTask] Error:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
