import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveCanonicalContactId } from "@/lib/crm/canonical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Create a note for a contact
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
  const { subject, summary, tags } = body;

  if (!subject && !summary) {
    return NextResponse.json({ error: "Subject or summary required" }, { status: 400 });
  }

  // Resolve user UUID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .single();

  if (!userRow?.id) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const dbUserId = userRow.id;

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

  // Create note in crm_interactions
  const { data: note, error: noteError } = await supabaseAdmin
    .from("crm_interactions")
    .insert({
      user_id: dbUserId,
      contact_id: canonicalId,
      type: "note",
      subject: subject || "Note",
      summary: summary || "",
      occurred_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (noteError || !note) {
    return NextResponse.json(
      { error: noteError?.message || "Failed to create note" },
      { status: 500 }
    );
  }

  // Create contact event for timeline
  await supabaseAdmin
    .from("crm_contact_events")
    .insert({
      owner_user_id: clerkUserId,
      contact_id: canonicalId,
      event_type: "note",
      occurred_at: new Date().toISOString(),
      title: subject || "Note",
      body: summary || "",
      source: "manual",
      source_id: note.id,
    });

  // Refresh intel snapshot (async, don't wait)
  supabaseAdmin.rpc("refresh_contact_intel", {
    p_contact_id: canonicalId,
    p_owner_user_id: clerkUserId,
  }).catch(console.error);

  return NextResponse.json({
    success: true,
    note: {
      id: note.id,
      subject: note.subject,
      summary: note.summary,
      occurredAt: note.occurred_at,
    },
  });
}

