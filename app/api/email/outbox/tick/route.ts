import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runOutboxFlush } from "@/lib/email/outboxWorker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Cron tick:
 * - Protected by EMAIL_CRON_SECRET
 * - Runs a small batch each tick
 * - Safe to run concurrently thanks to leasing/claiming
 */
export async function POST(req: Request) {
  const cronSecret = process.env.EMAIL_CRON_SECRET;
  if (cronSecret) {
    const got = req.headers.get("x-pulse-cron-secret");
    if (got !== cronSecret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const sb = supabaseAdmin();
  const url = new URL(req.url);

  // Keep these conservative; cron will run repeatedly.
  const limit = clamp(Number(url.searchParams.get("limit") || 10), 1, 50);
  const leaseSeconds = clamp(Number(url.searchParams.get("leaseSeconds") || 120), 10, 600);

  const workerId = `cron_${Date.now()}`;

  try {
    const result = await runOutboxFlush({ sb, limit, leaseSeconds, workerId });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "tick_failed" }, { status: 500 });
  }
}
