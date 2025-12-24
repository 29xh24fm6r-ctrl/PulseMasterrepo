import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-click send:
 * - queues draft into outbox (thread-true if source_event_id)
 * - immediately calls outbox flush for JUST that row
 *
 * Safety:
 * - requires EMAIL_FLUSH_SECRET
 * - sendEmail() still honors EMAIL_REAL_SEND_ENABLED
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });

  const flushSecret = process.env.EMAIL_FLUSH_SECRET;
  if (!flushSecret) return NextResponse.json({ ok: false, error: "missing_EMAIL_FLUSH_SECRET" }, { status: 500 });

  const sb = supabaseAdmin();

  const { data: draft, error: dErr } = await sb
    .from("email_suggested_drafts")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (dErr) return NextResponse.json({ ok: false, error: dErr.message }, { status: 500 });
  if (!draft) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  // Threading headers from email_events
  let inReplyTo: string | null = null;
  let references: string[] | null = null;

  if (draft.source_event_id) {
    const { data: ev } = await sb
      .from("email_events")
      .select("message_id,references")
      .eq("id", draft.source_event_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (ev?.message_id) inReplyTo = String(ev.message_id);

    if (Array.isArray(ev?.references) && ev.references.length) {
      references = ev.references.map(String);
      if (inReplyTo && !references.includes(inReplyTo)) references = [...references, inReplyTo];
    } else if (inReplyTo) {
      references = [inReplyTo];
    }
  }

  const { data: out, error: oErr } = await sb
    .from("email_outbox")
    .insert({
      user_id: userId,
      email_thread_id: draft.source_event_id || "",
      status: "queued",
      to_email: String(draft.to_email),
      subject: String(draft.subject),
      html: String(draft.body),
      in_reply_to: inReplyTo,
      references,
      send_intent: "real",
      attempt_count: 0,
      next_attempt_at: null,
      last_error: null,
      auto_fix_suggested: false,
      auto_fix_payload: null,
      failure_code: null,
    })
    .select("id")
    .single();

  if (oErr) return NextResponse.json({ ok: false, error: oErr.message }, { status: 500 });

  await sb.from("email_suggested_drafts").update({ active: false }).eq("id", id).eq("user_id", userId).catch(() => {});

  // Flush only this one id via query param
  const origin = new URL(req.url).origin;
  const flushResp = await fetch(`${origin}/api/email/outbox/flush?limit=1&id=${out.id}`, {
    method: "POST",
    headers: { "x-pulse-flush-secret": flushSecret },
    cache: "no-store",
  });

  const flushJson = await flushResp.json().catch(() => ({}));

  return NextResponse.json({
    ok: true,
    outbox_id: out.id,
    flush: { ok: flushResp.ok, status: flushResp.status, body: flushJson },
  });
}

