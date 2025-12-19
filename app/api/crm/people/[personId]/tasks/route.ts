import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveCanonicalContactId } from "@/lib/crm/canonical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Create a task for a contact
 * Also creates a contact event for timeline
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ personId: string }> | { personId: string } }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = params instanceof Promise ? await params : params;
  const personId = resolvedParams.personId;

  if (!personId) {
    return NextResponse.json({ error: "Missing personId" }, { status: 400 });
  }

  const body = await req.json();
  const { title, description, dueAt, priority = "medium", status = "pending" } = body;

  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  // Resolve canonical contact ID
  let canonicalId = personId;
  try {
    const resolved = await resolveCanonicalContactId(personId, clerkUserId);
    canonicalId = resolved.canonicalId;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Contact not found" },
      { status: 404 }
    );
  }

  // Create task
  const { data: task, error: taskError } = await supabaseAdmin
    .from("crm_tasks")
    .insert({
      owner_user_id: clerkUserId,
      contact_id: canonicalId,
      title,
      description: description || "",
      status,
      priority,
      due_at: dueAt || null,
    })
    .select()
    .single();

  if (taskError || !task) {
    return NextResponse.json(
      { error: taskError?.message || "Failed to create task" },
      { status: 500 }
    );
  }

  // Create contact event for timeline
  await supabaseAdmin
    .from("crm_contact_events")
    .insert({
      owner_user_id: clerkUserId,
      contact_id: canonicalId,
      event_type: "task_created",
      occurred_at: new Date().toISOString(),
      title: `Task: ${title}`,
      body: description || "",
      source: "manual",
      source_id: task.id,
    });

  // Refresh intel snapshot (async)
  supabaseAdmin.rpc("refresh_contact_intel", {
    p_contact_id: canonicalId,
    p_owner_user_id: clerkUserId,
  }).catch(console.error);

  return NextResponse.json({
    success: true,
    task: {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueAt: task.due_at,
    },
  });
}

