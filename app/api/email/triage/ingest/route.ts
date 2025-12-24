import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { triageEmail } from "@/lib/email/triageAI";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IngestBody = {
  message_id: string;
  thread_id?: string | null;
  from_email: string;
  to_email: string;
  subject: string;
  snippet: string;
  received_at?: string | null; // ISO
};

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const b = (await req.json()) as IngestBody;
  if (!b?.message_id) return NextResponse.json({ ok: false, error: "missing_message_id" }, { status: 400 });

  const sb = supabaseAdmin();

  // idempotency: if message already ingested, return existing triage
  const { data: existing } = await sb
    .from("email_events")
    .select("id,triage_label,triage_confidence")
    .eq("user_id", userId)
    .eq("message_id", b.message_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      ok: true,
      already_ingested: true,
      event_id: existing.id,
      triage: {
        label: existing.triage_label,
        confidence: existing.triage_confidence,
      },
    });
  }

  const triage = triageEmail({ subject: b.subject, snippet: b.snippet });

  const receivedAt = b.received_at ? new Date(b.received_at).toISOString() : new Date().toISOString();

  const { data: ev, error: evErr } = await sb
    .from("email_events")
    .insert({
      user_id: userId,
      direction: "inbound",
      message_id: b.message_id,
      thread_id: b.thread_id ?? null,
      from_email: b.from_email,
      to_email: b.to_email,
      subject: b.subject,
      snippet: b.snippet,
      received_at: receivedAt,
      triage_label: triage.label,
      triage_confidence: triage.confidence,
      triage_payload: triage,
    })
    .select("id")
    .single();

  if (evErr) return NextResponse.json({ ok: false, error: evErr.message }, { status: 500 });

  // Create a reminder if recommended (uses your existing reminder_subscriptions table)
  if (triage.recommend.create_reminder) {
    await sb
      .from("reminder_subscriptions")
      .insert({
        user_id: userId,
        title: triage.label === "needs_reply" ? "Email needs reply" : "Email requires action",
        body: `${b.subject}\n\nFrom: ${b.from_email}\n\n${b.snippet}\n\n(triage=${triage.label}, conf=${triage.confidence})`,
        severity: triage.label === "needs_reply" ? "warn" : "info",
        source_type: "email_event",
        source_id: ev.id,
        kind: "triage",
        next_run_at: new Date().toISOString(),
        active: true,
      })
      .catch(() => {});
  }

  // Create a suggested draft (safe/checksummed) if recommended
  if (triage.recommend.create_suggested_draft) {
    const subject = /^re:\s*/i.test(b.subject) ? b.subject : `Re: ${b.subject}`;

    const body =
      `Hi,\n\n` +
      `Just following up on your note below.\n\n` +
      `Could you confirm the next step / timing?\n\n` +
      `Thanks,\n`;

    const safe_checksum = sha256(
      JSON.stringify({
        to_email: b.from_email,
        subject,
        body,
        source_event_id: ev.id,
        kind: "reply",
      })
    );

    await sb
      .from("email_suggested_drafts")
      .insert({
        user_id: userId,
        source_event_id: ev.id,
        kind: "reply",
        to_email: b.from_email,
        subject,
        body,
        safe_checksum,
        active: true,
      })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true, event_id: ev.id, triage });
}

