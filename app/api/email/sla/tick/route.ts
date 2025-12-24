import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * SLA tick:
 * - Finds inbound email_events with triage_label in (needs_reply, request)
 * - If no outbound reply exists (by in_reply_to match), escalates reminders:
 *   - warn after warn_after
 *   - urgent after urgent_after
 * - Optionally creates a follow-up suggested draft when urgent
 *
 * Security:
 * - protected by EMAIL_CRON_SECRET (header) OR by running behind your cron proxy.
 */
export async function POST(req: Request) {
  const cronSecret = process.env.EMAIL_CRON_SECRET;
  if (cronSecret) {
    const got = req.headers.get("x-pulse-cron-secret");
    if (got !== cronSecret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const url = new URL(req.url);
  const limit = clamp(Number(url.searchParams.get("limit") || 50), 1, 200);

  const sb = supabaseAdmin();

  // Pull active global rules
  const { data: rules, error: rErr } = await sb
    .from("email_sla_rules")
    .select("*")
    .eq("active", true)
    .is("user_id", null);

  if (rErr) return NextResponse.json({ ok: false, error: rErr.message }, { status: 500 });
  const ruleByLabel = new Map<string, any>();
  for (const r of rules ?? []) ruleByLabel.set(String(r.applies_to), r);

  const labels = ["needs_reply", "request"];

  // Find recent-ish inbound events (last 7 days), then evaluate SLA in code
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const { data: events, error: eErr } = await sb
    .from("email_events")
    .select("id,user_id,message_id,from_email,subject,snippet,received_at,triage_label,triage_confidence")
    .eq("direction", "inbound")
    .in("triage_label", labels)
    .gte("received_at", since)
    .order("received_at", { ascending: true })
    .limit(limit);

  if (eErr) return NextResponse.json({ ok: false, error: eErr.message }, { status: 500 });

  let processed = 0;
  const actions: any[] = [];

  for (const ev of events ?? []) {
    processed++;

    const appliesTo = String(ev.triage_label || "");
    const rule = ruleByLabel.get(appliesTo);
    if (!rule) continue;

    const receivedAt = ev.received_at ? new Date(ev.received_at).getTime() : 0;
    if (!receivedAt) continue;

    const msAge = Date.now() - receivedAt;
    const warnAfterMs = intervalToMs(rule.warn_after);
    const urgentAfterMs = intervalToMs(rule.urgent_after);

    const shouldWarn = msAge >= warnAfterMs;
    const shouldUrgent = msAge >= urgentAfterMs;

    if (!shouldWarn && !shouldUrgent) continue;

    // Skip if we already replied (email_outbox in_reply_to == inbound message_id AND status sent/queued/sending)
    if (ev.message_id) {
      const { data: replied } = await sb
        .from("email_outbox")
        .select("id")
        .eq("user_id", ev.user_id)
        .eq("in_reply_to", ev.message_id)
        .in("status", ["queued", "sending", "sent"])
        .limit(1);

      if (replied && replied.length) continue;
    }

    // Create or escalate a reminder keyed to this email_event
    const severity = shouldUrgent ? "urgent" : "warn";
    const title = shouldUrgent ? "URGENT: email overdue" : "Email reply SLA approaching";
    const body =
      `${ev.subject}\n\nFrom: ${ev.from_email}\n\n${ev.snippet}\n\n` +
      `(SLA=${appliesTo}, overdue=${shouldUrgent ? "urgent" : "warn"})`;

    // Upsert-ish by deactivating old + inserting new (keeps schema simple)
    await sb
      .from("reminder_subscriptions")
      .update({ active: false, handled_at: new Date().toISOString() })
      .eq("user_id", ev.user_id)
      .eq("source_type", "email_event")
      .eq("source_id", ev.id)
      .eq("kind", "sla")
      .eq("active", true)
      .catch(() => {});

    await sb
      .from("reminder_subscriptions")
      .insert({
        user_id: ev.user_id,
        title,
        body,
        severity,
        source_type: "email_event",
        source_id: ev.id,
        kind: "sla",
        next_run_at: new Date().toISOString(),
        active: true,
      })
      .catch(() => {});

    actions.push({ event_id: ev.id, severity });

    // If urgent + auto_follow_up, generate a suggested follow-up draft
    if (shouldUrgent && !!rule.auto_follow_up) {
      const toEmail = String(ev.from_email || "").trim();
      if (toEmail) {
        const subj = /^re:\s*/i.test(String(ev.subject || "")) ? String(ev.subject || "") : `Re: ${String(ev.subject || "")}`;

        const draftBody =
          `Hi,\n\n` +
          `Just checking back in on this — wanted to make sure it didn't get buried.\n\n` +
          `Do you have an update on next steps / timing?\n\n` +
          `Thanks,\n`;

        const checksum = simpleChecksum({
          to_email: toEmail,
          subject: subj,
          body: draftBody,
          source_event_id: ev.id,
          kind: "follow_up",
        });

        await sb
          .from("email_suggested_drafts")
          .insert({
            user_id: ev.user_id,
            source_event_id: ev.id,
            kind: "follow_up",
            to_email: toEmail,
            subject: subj,
            body: draftBody,
            safe_checksum: checksum,
            active: true,
          })
          .catch(() => {});
      }
    }
  }

  return NextResponse.json({ ok: true, processed, actions });
}

function intervalToMs(v: any): number {
  // PostgREST returns interval as string like "04:00:00" or "2 days"
  const s = String(v || "").trim();
  if (!s) return 0;

  // "HH:MM:SS"
  const hms = s.match(/^(\d+):(\d+):(\d+)$/);
  if (hms) {
    const h = Number(hms[1]),
      m = Number(hms[2]),
      sec = Number(hms[3]);
    return (h * 3600 + m * 60 + sec) * 1000;
  }

  // "X days" / "X day"
  const days = s.match(/^(\d+)\s+day/);
  if (days) return Number(days[1]) * 24 * 3600 * 1000;

  // "X hours"
  const hours = s.match(/^(\d+)\s+hour/);
  if (hours) return Number(hours[1]) * 3600 * 1000;

  // "X minutes"
  const mins = s.match(/^(\d+)\s+min/);
  if (mins) return Number(mins[1]) * 60 * 1000;

  return 0;
}

function simpleChecksum(obj: any) {
  // lightweight deterministic checksum; OK for suggested drafts table
  const json = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    hash = (hash * 31 + json.charCodeAt(i)) >>> 0;
  }
  return String(hash);
}
