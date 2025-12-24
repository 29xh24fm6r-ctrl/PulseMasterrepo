import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { audit, autopilotEnabled, computeUndoUntil } from "@/lib/email/autopilot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReqBody = {
  draft_ids?: string[];
  // schedule delay (seconds) before worker attempts to send
  delay_seconds?: number; // default 0
  // if true: send_intent='real' else 'safe'
  intent?: "real" | "safe";
};

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!autopilotEnabled()) return NextResponse.json({ ok: false, error: "autopilot_disabled" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as ReqBody;
  const ids = Array.isArray(body.draft_ids) ? body.draft_ids.map(String).filter(Boolean) : [];
  if (!ids.length) return NextResponse.json({ ok: false, error: "missing_draft_ids" }, { status: 400 });

  const delay = Math.max(0, Math.min(60 * 60, Number(body.delay_seconds || 0)));
  const now = new Date();
  const scheduled = new Date(now.getTime() + delay * 1000).toISOString();
  const undoUntil = computeUndoUntil(now);

  const realEnabled = String(process.env.EMAIL_REAL_SEND_ENABLED || "false") === "true";
  const requestedIntent = body.intent === "real" ? "real" : "safe";
  const sendIntent = requestedIntent === "real" && realEnabled ? "real" : "safe";

  const sb = supabaseAdmin();

  // load drafts
  const { data: drafts, error: dErr } = await sb
    .from("email_suggested_drafts")
    .select("*")
    .eq("user_id", userId)
    .in("id", ids)
    .eq("active", true);

  if (dErr) return NextResponse.json({ ok: false, error: dErr.message }, { status: 500 });
  if (!drafts?.length) return NextResponse.json({ ok: false, error: "no_active_drafts_found" }, { status: 404 });

  const created: any[] = [];

  for (const d of drafts) {
    // thread headers from source_event_id -> email_events
    let inReplyTo: string | null = null;
    let references: string[] | null = null;

    if (d.source_event_id) {
      const { data: ev } = await sb
        .from("email_events")
        .select("message_id,references")
        .eq("id", d.source_event_id)
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

    // create outbox row as pending_send (approval step)
    const { data: out, error: oErr } = await sb
      .from("email_outbox")
      .insert({
        user_id: userId,
        status: "pending_send",
        send_intent: sendIntent,
        approved_by_user: true,
        approved_at: now.toISOString(),
        scheduled_send_at: scheduled,
        undo_until: undoUntil,
        source_draft_id: d.id,

        to_email: String(d.to_email),
        subject: String(d.subject),
        html: String(d.body),

        in_reply_to: inReplyTo,
        references,

        attempt_count: 0,
        next_attempt_at: null,
        last_error: null,
      })
      .select("id,send_intent,status,scheduled_send_at,undo_until")
      .single();

    if (oErr) {
      created.push({ draft_id: d.id, ok: false, error: oErr.message });
      continue;
    }

    // deactivate draft so queue is clean
    await sb.from("email_suggested_drafts").update({ active: false }).eq("id", d.id).eq("user_id", userId).catch(() => {});

    await audit(userId, out.id, "approved", { draft_id: d.id, send_intent: sendIntent });
    await audit(userId, out.id, "scheduled", { scheduled_send_at: scheduled, undo_until: undoUntil });

    created.push({ draft_id: d.id, ok: true, outbox_id: out.id, ...out });
  }

  return NextResponse.json({ ok: true, requested_intent: requestedIntent, effective_intent: sendIntent, created });
}

