import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { triageEmail } from "@/lib/email/triageAI";
import { buildSmartFollowUp } from "@/lib/email/smartFollowUp";
import { ensureReplySubject } from "@/lib/email/replyFormat";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const message_id = body?.message_id ? String(body.message_id).trim() : "";
  const from_email = body?.from_email ? String(body.from_email).trim() : "";
  const to_email = body?.to_email ? String(body.to_email).trim() : "";
  const subject = body?.subject ? String(body.subject).trim() : "";
  const snippet = body?.snippet ? String(body.snippet).trim() : "";
  const received_at = body?.received_at ? String(body.received_at).trim() : new Date().toISOString();

  if (!message_id || !from_email || !to_email) {
    return NextResponse.json(
      { ok: false, error: "missing_required_fields", hint: "message_id, from_email, to_email required" },
      { status: 400 }
    );
  }

  const sb = supabaseAdmin();

  // Run triage
  const triage = triageEmail({
    subject,
    snippet,
    from_email,
  });

  // Store event
  const { data: event, error: eventErr } = await sb
    .from("email_events")
    .insert({
      user_id: userId,
      direction: "inbound",
      message_id,
      from_email,
      to_email,
      subject,
      snippet,
      received_at,
      triage_label: triage.label,
      triage_confidence: triage.confidence,
      triage_payload: triage,
    })
    .select("id")
    .single();

  if (eventErr) {
    return NextResponse.json(
      { ok: false, error: "event_insert_failed", detail: eventErr.message },
      { status: 500 }
    );
  }

  const actions: Array<{ type: string; id?: string }> = [];

  // Execute suggested actions
  if (triage.action === "draft_reply") {
    const draftBody = buildSmartFollowUp({
      tone: "professional",
      goal: "respond clearly and helpfully",
      quoteFrom: from_email,
      quoteDate: received_at,
      quoteSnippet: snippet || null,
    });

    const draftSubject = ensureReplySubject(subject || "Re:");

    const safeChecksum = sha256(
      JSON.stringify({
        email_thread_id: message_id,
        to_email: from_email,
        subject: draftSubject,
        body_text: draftBody,
        in_reply_to: message_id ?? null,
        references: message_id ? [message_id] : null,
        v: 2,
      })
    );

    const { data: draft } = await sb
      .from("email_drafts")
      .insert({
        user_id: userId,
        email_thread_id: message_id,
        to_email: from_email,
        subject: draftSubject,
        body_text: draftBody,
        safe_checksum: safeChecksum,
        evidence: {
          source: "triage_auto_draft",
          event_id: event.id,
          triage_label: triage.label,
        },
      })
      .select("id")
      .single();

    if (draft) {
      actions.push({ type: "draft_created", id: draft.id });
    }
  }

  if (triage.action === "create_task") {
    // Create a task (assuming you have a tasks table)
    // This is a placeholder - adjust to match your actual tasks schema
    const { data: task } = await sb
      .from("tasks")
      .insert({
        user_id: userId,
        title: subject || "Email task",
        description: snippet || "",
        status: "todo",
        metadata: {
          source: "email_triage",
          event_id: event.id,
          message_id,
          from_email,
        },
      })
      .select("id")
      .single()
      .catch(() => null);

    if (task) {
      actions.push({ type: "task_created", id: task.id });
    }
  }

  // Create reminder for needs_reply
  if (triage.label === "needs_reply") {
    const { data: reminder } = await sb
      .from("reminder_subscriptions")
      .insert({
        user_id: userId,
        title: `Reply: ${subject || "Email"}`,
        description: snippet || "",
        due_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
        priority: "normal",
        metadata: {
          source: "email_triage",
          event_id: event.id,
          message_id,
          from_email,
          triage_label: triage.label,
        },
      })
      .select("id")
      .single()
      .catch(() => null);

    if (reminder) {
      actions.push({ type: "reminder_created", id: reminder.id });
    }
  }

  return NextResponse.json({
    ok: true,
    event: {
      id: event.id,
      triage_label: triage.label,
      triage_confidence: triage.confidence,
      action: triage.action,
    },
    actions,
  });
}

