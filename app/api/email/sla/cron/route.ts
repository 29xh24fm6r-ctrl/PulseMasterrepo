import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;

  const secret = process.env.EMAIL_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "missing_EMAIL_CRON_SECRET" }, { status: 500 });
  }

  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") || 50)));

  const resp = await fetch(`${origin}/api/email/sla/tick?limit=${limit}`, {
    method: "POST",
    headers: { "x-pulse-cron-secret": secret },
    cache: "no-store",
  });

  const data = await resp.json().catch(() => ({}));
  return NextResponse.json({ ok: resp.ok, upstream_status: resp.status, ...data }, { status: resp.ok ? 200 : resp.status });
}

