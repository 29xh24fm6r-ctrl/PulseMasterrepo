import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail, type NormalizedSendError } from "@/lib/email/sender";
import { audit } from "@/lib/email/autopilot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.EMAIL_AUTOPILOT_CRON_SECRET;
  if (secret) {
    const got = req.headers.get("x-pulse-autopilot-secret");
    if (got !== secret) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const sb = supabaseAdmin();

  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(25, Number(url.searchParams.get("limit") || 10)));

  // load eligible pending rows
  const nowIso = new Date().toISOString();

  const { data: rows, error } = await sb
    .from("email_outbox")
    .select("*")
    .eq("status", "pending_send")
    .lte("scheduled_send_at", nowIso)
    .order("scheduled_send_at", { ascending: true })
    .limit(limit);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!rows?.length) return NextResponse.json({ ok: true, processed: 0 });

  const realEnabled = String(process.env.EMAIL_REAL_SEND_ENABLED || "false") === "true";
  const results: any[] = [];

  for (const row of rows) {
    const userId = String(row.user_id || "");
    const outboxId = String(row.id);

    try {
      await audit(userId, outboxId, "attempt_send", {
        send_intent: row.send_intent ?? null,
        scheduled_send_at: row.scheduled_send_at ?? null,
      });

      // Gate real sending:
      // If intent is real but real-send disabled, fail safely (mark failed)
      const intent = String(row.send_intent || "safe");
      if (intent === "real" && !realEnabled) {
        await sb
          .from("email_outbox")
          .update({ status: "failed", last_error: "real_send_disabled" })
          .eq("id", outboxId)
          .eq("status", "pending_send");
        await audit(userId, outboxId, "failed", { error: "real_send_disabled" });
        results.push({ id: outboxId, ok: false, error: "real_send_disabled" });
        continue;
      }

      // Lock row by transitioning pending_send -> queued (so we never process twice)
      const { error: lockErr } = await sb
        .from("email_outbox")
        .update({ status: "queued" })
        .eq("id", outboxId)
        .eq("status", "pending_send");

      if (lockErr) throw new Error(`lock_failed:${lockErr.message}`);

      // Send
      const to = String(row.to_email ?? row.to ?? "");
      const subject = String(row.subject ?? "");
      const html = String(row.html ?? row.body_html ?? row.body ?? "");

      const inReplyTo = row.in_reply_to ? String(row.in_reply_to) : undefined;
      const references = Array.isArray(row.references) ? row.references.map(String) : undefined;

      const sent = await sendEmail({ to, subject, html, inReplyTo, references });

      const { error: upErr } = await sb
        .from("email_outbox")
        .update({
          status: "sent",
          provider: sent.provider,
          provider_message_id: sent.provider_message_id,
          sent_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", outboxId);

      if (upErr) throw new Error(`outbox_update_failed:${upErr.message}`);

      await audit(userId, outboxId, "sent", {
        provider: sent.provider,
        provider_message_id: sent.provider_message_id,
      });

      results.push({ id: outboxId, ok: true, provider_message_id: sent.provider_message_id });
    } catch (e) {
      const ne = e as NormalizedSendError;
      await sb
        .from("email_outbox")
        .update({
          status: "failed",
          last_error: typeof ne?.message === "string" ? ne.message : "send_failed",
        })
        .eq("id", outboxId);

      await audit(String(row.user_id || ""), outboxId, "failed", { error: ne?.message ?? "send_failed", code: ne?.code ?? "unknown" });

      results.push({ id: outboxId, ok: false, error: ne?.message ?? "send_failed" });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}

