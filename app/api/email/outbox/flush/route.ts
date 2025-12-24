import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runOutboxFlush } from "@/lib/email/outboxWorker";
import { sendEmail, type NormalizedSendError } from "@/lib/email/sender";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function POST(req: Request) {
  const sb = supabaseAdmin();

  const url = new URL(req.url);
  const limit = clamp(Number(url.searchParams.get("limit") || 10), 1, 50);
  const onlyId = url.searchParams.get("id");

  const secret = process.env.EMAIL_FLUSH_SECRET;
  if (secret) {
    const got = req.headers.get("x-pulse-flush-secret");
    if (got !== secret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  // If ?id is specified, use simple direct flush (for send-now)
  if (onlyId) {
    const { data: row, error: rowErr } = await sb
      .from("email_outbox")
      .select("*")
      .eq("id", onlyId)
      .eq("status", "queued")
      .maybeSingle();

    if (rowErr) return NextResponse.json({ ok: false, error: rowErr.message }, { status: 500 });
    if (!row) return NextResponse.json({ ok: false, error: "not_found_or_not_queued" }, { status: 404 });

    try {
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
        .eq("id", row.id);

      if (upErr) throw new Error(`outbox_update_failed:${upErr.message}`);

      return NextResponse.json({ ok: true, processed: 1, results: [{ id: row.id, ok: true, provider_message_id: sent.provider_message_id }] });
    } catch (e) {
      const ne = e as NormalizedSendError;
      await sb
        .from("email_outbox")
        .update({
          status: "failed",
          last_error: typeof ne?.message === "string" ? ne.message : "send_failed",
        })
        .eq("id", row.id);

      return NextResponse.json({
        ok: true,
        processed: 1,
        results: [{ id: row.id, ok: false, error: ne?.message ?? "send_failed", code: ne?.code ?? "unknown" }],
      });
    }
  }

  // Otherwise, use the worker-based flush (with leasing/retries)
  const leaseSeconds = clamp(Number(url.searchParams.get("leaseSeconds") || 120), 10, 600);
  const workerId = req.headers.get("x-pulse-worker-id") || `worker_${Math.random().toString(16).slice(2)}_${Date.now()}`;

  try {
    const result = await runOutboxFlush({ sb, limit, leaseSeconds, workerId });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "flush_failed" }, { status: 500 });
  }
}
