import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isoHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const sb = supabaseAdmin();

  // Counts by status (cheap)
  const { data: statusCounts, error: cErr } = await sb
    .from("email_outbox")
    .select("status")
    .in("status", ["queued", "sending", "sent", "failed"]);

  if (cErr) {
    return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });
  }

  const counts = { queued: 0, sending: 0, sent: 0, failed: 0 };
  for (const r of statusCounts ?? []) {
    const s = String((r as any).status);
    if (s in counts) (counts as any)[s] += 1;
  }

  const since24h = isoHoursAgo(24);

  // Sent/failed last 24h (more meaningful operationally)
  const { data: sent24, error: sErr } = await sb
    .from("email_outbox")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("sent_at", since24h);

  if (sErr) {
    return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 });
  }

  // Failed last 24h - use updated_at if exists, else fallback to created_at
  // Query all failed, then filter in code (simpler than complex OR)
  const { data: allFailed, error: fErr } = await sb
    .from("email_outbox")
    .select("id,updated_at,created_at")
    .eq("status", "failed");

  if (fErr) {
    return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });
  }

  const failed24 = (allFailed ?? []).filter((f: any) => {
    const updated = f.updated_at ? new Date(f.updated_at).getTime() : null;
    const created = f.created_at ? new Date(f.created_at).getTime() : null;
    const cutoff = new Date(since24h).getTime();
    return (updated && updated >= cutoff) || (created && created >= cutoff);
  }).length;

  if (fErr) {
    return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });
  }

  // Next retry ETA (soonest next_attempt_at among queued)
  const { data: nextRetryRow, error: nErr } = await sb
    .from("email_outbox")
    .select("id,next_attempt_at")
    .eq("status", "queued")
    .not("next_attempt_at", "is", null)
    .order("next_attempt_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nErr) {
    return NextResponse.json({ ok: false, error: nErr.message }, { status: 500 });
  }

  // Last 10 failures (with auto-fix info)
  const { data: lastFails, error: lfErr } = await sb
    .from("email_outbox")
    .select("id,last_error,attempt_count,max_attempts,updated_at,provider,provider_message_id,failure_code,auto_fix_suggested,auto_fix_payload")
    .eq("status", "failed")
    .order("updated_at", { ascending: false })
    .limit(10);

  if (lfErr) {
    return NextResponse.json({ ok: false, error: lfErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    counts,
    sent_24h: (sent24 as any)?.count ?? 0,
    failed_24h: failed24,
    next_retry: nextRetryRow
      ? { id: nextRetryRow.id, next_attempt_at: nextRetryRow.next_attempt_at }
      : null,
    last_failures: lastFails ?? [],
    now: new Date().toISOString(),
  });
}

