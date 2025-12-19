import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCrmPerson } from "@/lib/crm/getCrmPerson";
import { resolveCanonicalContactId } from "@/lib/crm/canonical";
import { getEmailThreadsForContact } from "@/lib/email/person";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Normalize PersonDetail API response to always include expected keys
 * Prevents UI crashes when queries return null/undefined
 */
function normalizePersonDetailPayload(input: any) {
  return {
    ok: true,
    merged: Boolean(input?.merged),
    merged_into_contact_id: input?.merged_into_contact_id ?? null,
    contact: input?.contact ?? null,
    deals: Array.isArray(input?.deals) ? input.deals : [],
    tasks: Array.isArray(input?.tasks) ? input.tasks : [],
    notes: Array.isArray(input?.notes) ? input.notes : [],
    emails: Array.isArray(input?.emails) ? input.emails : [],
    timeline: Array.isArray(input?.timeline) ? input.timeline : [],
    health: input?.health ?? null,
    meta: input?.meta ?? undefined, // ✅ preserve debug/meta
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ personId: string }> | { personId: string } }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Handle both Promise-based (Next.js 15+) and sync params (Next.js 14)
  const resolvedParams = params instanceof Promise ? await params : params;
  const personId = resolvedParams.personId;

  if (!personId) {
    return NextResponse.json(
      { ok: false, error: "Missing personId param" },
      { status: 400 }
    );
  }

  // Resolve user UUID
  const { data: userRow, error: userErr } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .single();

  if (userErr || !userRow?.id) {
    return NextResponse.json(
      { ok: false, error: "User not found" },
      { status: 404 }
    );
  }

  const dbUserId = userRow.id;

  // Resolve to canonical contact ID (handles merged contacts)
  let canonicalId = personId;
  let isMerged = false;
  try {
    const resolved = await resolveCanonicalContactId(personId, clerkUserId);
    canonicalId = resolved.canonicalId;
    isMerged = resolved.isMerged;
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Contact not found" },
      { status: 404 }
    );
  }

  // Fetch the canonical contact (use canonicalId for all queries)
  const { contact, error: contactError } = await getCrmPerson({
    contactId: canonicalId,
    clerkUserId,
    dbUserId,
  });

  if (!contact || contact.status !== "active") {
    return NextResponse.json(
      { ok: false, error: contactError || "Canonical contact not found" },
      { status: 404 }
    );
  }

  // If the ID changed (merged contact), return redirect info early
  if (isMerged && canonicalId !== personId) {
    const debug = process.env.NEXT_PUBLIC_DEBUG_PULSE === "1";
    return NextResponse.json(
      normalizePersonDetailPayload({
        merged: true,
        merged_into_contact_id: canonicalId,
        contact,
        deals: [],
        tasks: [],
        notes: [],
        health: null,
        meta: debug
          ? {
              userId: dbUserId,
              personId,
              canonicalId,
              merged: true,
              mergedInto: canonicalId,
            }
          : undefined,
      })
    );
  }

  // Fetch related data in parallel (using allSettled for resilience - one failing query won't break all)
  // Use canonicalId for all foreign key queries
  const results = await Promise.allSettled([
    // 0) Deals: linked via primary_contact_id
    supabaseAdmin
      .from("crm_deals")
      .select("id, name, stage, amount, close_date, created_at, updated_at")
      .eq("user_id", dbUserId)
      .eq("primary_contact_id", canonicalId)
      .order("updated_at", { ascending: false })
      .limit(20),

    // 1) Tasks: from crm_tasks linked via contact_id (scoped by owner_user_id = Clerk ID)
    supabaseAdmin
      .from("crm_tasks")
      .select("id, title, status, priority, due_at, deal_id, created_at, updated_at")
      .eq("owner_user_id", clerkUserId)
      .eq("contact_id", canonicalId)
      .in("status", ["pending", "in_progress", "open"])
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("priority", { ascending: false })
      .limit(20),

    // 2) Notes: from crm_interactions with type='note'
    supabaseAdmin
      .from("crm_interactions")
      .select("id, type, occurred_at, subject, summary")
      .eq("user_id", dbUserId)
      .eq("contact_id", canonicalId)
      .eq("type", "note")
      .order("occurred_at", { ascending: false })
      .limit(20),

    // 3) Relationship Health
    supabaseAdmin
      .from("crm_relationship_health")
      .select("id, score, momentum, last_interaction_at, next_suggested_checkin_at")
      .eq("user_id", dbUserId)
      .eq("contact_id", canonicalId)
      .single(),
  ]);

  const dealsResult = results[0].status === "fulfilled" ? results[0].value : null;
  const tasksResult = results[1].status === "fulfilled" ? results[1].value : null;
  const notesResult = results[2].status === "fulfilled" ? results[2].value : null;
  const healthResult = results[3].status === "fulfilled" ? results[3].value : null;

  const dealsError = results[0].status === "rejected" ? String(results[0].reason) : (dealsResult as any)?.error?.message || null;
  const tasksError = results[1].status === "rejected" ? String(results[1].reason) : (tasksResult as any)?.error?.message || null;
  const notesError = results[2].status === "rejected" ? String(results[2].reason) : (notesResult as any)?.error?.message || null;
  const healthError = results[3].status === "rejected" ? String(results[3].reason) : (healthResult as any)?.error?.message || null;

  // Transform deals to match PersonDetail expected format (with safe fallback)
  const deals = (((dealsResult as any)?.data) || []).map((deal: any) => ({
    id: deal.id,
    name: deal.name,
    stage: deal.stage,
    amount: deal.amount,
    due_at: deal.close_date,
    updated_at: deal.updated_at,
  }));

  // Transform tasks to match PersonDetail expected format (with safe fallback)
  const tasks = (((tasksResult as any)?.data) || []).map((task: any) => ({
    id: task.id,
    title: task.title, // ✅ correct column
    due_at: task.due_at, // ✅ timestamptz (perfect)
    status: task.status,
    priority: task.priority,
    deal_id: task.deal_id ?? null,
  }));

  // Transform notes to match PersonDetail expected format (with safe fallback)
  const notes = (((notesResult as any)?.data) || []).map((note: any) => ({
    id: note.id,
    subject: note.subject || "Note",
    summary: note.summary,
    occurred_at: note.occurred_at,
  }));

  // Transform health to match PersonDetail expected format (with safe fallback)
  const healthData = (healthResult as any)?.data ?? null;
  const health = healthData
    ? {
        score: healthData.score || 0,
        momentum: healthData.momentum || null,
        lastInteractionAt: healthData.last_interaction_at || null,
        nextCheckinAt: healthData.next_suggested_checkin_at || null,
      }
    : null;

  // Fetch emails if contact has primary_email
  let emails: any[] = [];
  let emailsError: string | null = null;
  
  if (contact.primary_email && dbUserId) {
    try {
      emails = await getEmailThreadsForContact({
        dbUserId,
        email: contact.primary_email,
        limit: 25,
      });
    } catch (err) {
      emailsError = err instanceof Error ? err.message : String(err);
      console.error("[PersonDetail API] Email fetch error:", err);
    }
  }

  // Build unified timeline: merge notes + tasks + emails
  const timeline: any[] = [];

  // Add notes to timeline
  notes.forEach((note: any) => {
    timeline.push({
      type: "note",
      id: note.id,
      occurred_at: note.occurred_at || new Date().toISOString(),
      title: note.subject || "Note",
      summary: note.summary,
      href: null,
    });
  });

  // Add tasks to timeline
  tasks.forEach((task: any) => {
    timeline.push({
      type: "task",
      id: task.id,
      occurred_at: task.due_at || new Date().toISOString(),
      title: task.title,
      summary: `Task (${task.status})`,
      href: null,
    });
  });

  // Add emails to timeline
  emails.forEach((email: any) => {
    timeline.push({
      type: "email",
      id: email.id,
      occurred_at: email.lastMessageAt,
      title: email.subject,
      summary: email.snippet || "",
      href: null, // TODO: link to email thread view
      unread: email.unread,
      starred: email.starred,
    });
  });

  // Sort timeline by occurred_at (most recent first)
  timeline.sort((a, b) => {
    const dateA = new Date(a.occurred_at || 0).getTime();
    const dateB = new Date(b.occurred_at || 0).getTime();
    return dateB - dateA;
  });

  // Debug meta block (toggleable via env var)
  const debug = process.env.NEXT_PUBLIC_DEBUG_PULSE === "1";
  const meta = debug
    ? {
        userId: dbUserId,
        personId,
        canonicalId,
        isMerged,
        contactEmail: contact.primary_email || null,
        counts: {
          deals: deals.length,
          tasks: tasks.length,
          notes: notes.length,
          emails: emails.length,
          timeline: timeline.length,
        },
        tables: {
          deals: "crm_deals.primary_contact_id",
          tasks: "crm_tasks.contact_id (scoped by owner_user_id)",
          notes: "crm_interactions(contact_id, type='note')",
          emails: "email_threads (matched by primary_email)",
          health: "crm_relationship_health.contact_id",
        },
        errors: { dealsError, tasksError, notesError, healthError, emailsError },
      }
    : undefined;

  return NextResponse.json(
    normalizePersonDetailPayload({
      contact,
      deals,
      tasks,
      notes,
      emails,
      timeline,
      health,
      meta,
    })
  );
}

