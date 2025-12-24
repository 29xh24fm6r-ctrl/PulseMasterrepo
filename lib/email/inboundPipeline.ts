import { supabaseAdmin } from "@/lib/supabase/admin";
import { triageEmail } from "@/lib/email/triageAI";
import { ensureSuggestedDraftForEvent } from "@/lib/email/suggestedDrafts";

export type InboundMsg = {
  user_id: string;
  message_id: string;
  thread_id?: string | null;
  from_email: string;
  to_email: string;
  subject: string;
  snippet: string;
  received_at: string; // ISO
  in_reply_to?: string | null;
  references?: string[] | null;
};

export async function ingestInboundEmail(msg: InboundMsg) {
  const sb = supabaseAdmin();

  const { data: existing, error: exErr } = await sb
    .from("email_events")
    .select("id")
    .eq("user_id", msg.user_id)
    .eq("message_id", msg.message_id)
    .maybeSingle();

  if (exErr) throw new Error(`email_events_lookup_failed:${exErr.message}`);
  if (existing) return { already_ingested: true, event_id: existing.id };

  const triage = triageEmail({ subject: msg.subject, snippet: msg.snippet });

  const { data: ev, error: insErr } = await sb
    .from("email_events")
    .insert({
      user_id: msg.user_id,
      direction: "inbound",
      message_id: msg.message_id,
      thread_id: msg.thread_id ?? null,
      from_email: msg.from_email,
      to_email: msg.to_email,
      subject: msg.subject,
      snippet: msg.snippet,
      received_at: msg.received_at,
      in_reply_to: msg.in_reply_to ?? null,
      references: Array.isArray(msg.references) ? msg.references : null,
      triage_label: triage.label,
      triage_confidence: triage.confidence,
      triage_payload: triage,
    })
    .select("id")
    .single();

  if (insErr) throw new Error(`email_events_insert_failed:${insErr.message}`);

  // triage reminder (best effort)
  if (triage.recommend.create_reminder) {
    await sb
      .from("reminder_subscriptions")
      .insert({
        user_id: msg.user_id,
        title: triage.label === "needs_reply" ? "Email needs reply" : "Email requires action",
        body: `${msg.subject}\n\nFrom: ${msg.from_email}\n\n${msg.snippet}\n\n(triage=${triage.label}, conf=${triage.confidence})`,
        severity: triage.label === "needs_reply" ? "warn" : "info",
        source_type: "email_event",
        source_id: ev.id,
        kind: "triage",
        next_run_at: new Date().toISOString(),
        active: true,
      })
      .catch(() => {});
  }

  // AUTO: suggested draft on ingest (deduped)
  if (triage.recommend.create_suggested_draft) {
    // Uses AI if enabled; deterministic otherwise.
    await ensureSuggestedDraftForEvent({
      userId: msg.user_id,
      sourceEventId: String(ev.id),
      kind: "reply",
      tone: "friendly, concise, confident",
      goal: "Reply helpfully and move the thread forward.",
    }).catch(() => {});
  }

  return { already_ingested: false, event_id: ev.id, triage };
}
