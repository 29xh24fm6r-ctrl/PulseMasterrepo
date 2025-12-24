import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ensureSuggestedDraftForEvent } from "@/lib/email/suggestedDrafts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SLA follow-up cron:
 * - finds inbound events older than EMAIL_SLA_DAYS
 * - triage_label in ('waiting_on_them','request')
 * - if NO outbound event exists later in the same thread, generate follow_up draft
 *
 * Protect with header: x-pulse-sla-secret
 */
export async function POST(req: Request) {
  const secret = process.env.EMAIL_SLA_CRON_SECRET;
  if (secret) {
    const got = req.headers.get("x-pulse-sla-secret");
    if (got !== secret) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const days = Math.max(1, Math.min(30, Number(process.env.EMAIL_SLA_DAYS || 3)));
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const sb = supabaseAdmin();

  const { data: candidates, error } = await sb
    .from("email_events")
    .select("id,user_id,thread_id,received_at,triage_label")
    .eq("direction", "inbound")
    .in("triage_label", ["waiting_on_them", "request"])
    .lt("received_at", cutoff)
    .order("received_at", { ascending: true })
    .limit(50);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const results: any[] = [];

  for (const ev of candidates ?? []) {
    try {
      const userId = String(ev.user_id || "");
      const threadId = ev.thread_id ? String(ev.thread_id) : null;
      const receivedAt = ev.received_at ? String(ev.received_at) : null;

      if (!userId || !receivedAt) {
        results.push({ event_id: ev.id, ok: false, error: "missing_user_or_time" });
        continue;
      }

      // If thread_id exists, verify there is NOT a later outbound in same thread
      if (threadId) {
        const { data: outboundLater } = await sb
          .from("email_events")
          .select("id")
          .eq("user_id", userId)
          .eq("thread_id", threadId)
          .eq("direction", "outbound")
          .gt("received_at", receivedAt)
          .limit(1);

        if (Array.isArray(outboundLater) && outboundLater.length) {
          results.push({ event_id: ev.id, ok: true, skipped: "outbound_exists" });
          continue;
        }
      }

      const r = await ensureSuggestedDraftForEvent({
        userId,
        sourceEventId: String(ev.id),
        kind: "follow_up",
        tone: "friendly, concise, professional",
        goal: "Send a brief follow-up asking for an update and next steps/timing.",
      });

      results.push({ event_id: ev.id, ok: true, ...r });
    } catch (e: any) {
      results.push({ event_id: ev.id, ok: false, error: e?.message || "failed" });
    }
  }

  return NextResponse.json({ ok: true, cutoff, processed: results.length, results });
}

