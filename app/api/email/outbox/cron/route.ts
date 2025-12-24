import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron proxy:
 * - Called by Vercel cron (no headers required)
 * - Server-side fetch to /tick with x-pulse-cron-secret injected
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;

  const cronSecret = process.env.EMAIL_CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: "missing_EMAIL_CRON_SECRET" }, { status: 500 });
  }

  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") || 10)));

  const resp = await fetch(`${origin}/api/email/outbox/tick?limit=${limit}`, {
    method: "POST",
    headers: {
      "x-pulse-cron-secret": cronSecret,
    },
    cache: "no-store",
  });

  const data = await resp.json().catch(() => ({}));
  return NextResponse.json(
    { ok: resp.ok, upstream_status: resp.status, ...data },
    { status: resp.ok ? 200 : resp.status }
  );
}

