import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;

  const secret = process.env.EMAIL_CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "missing_EMAIL_CRON_SECRET" }, { status: 500 });

  const limit = Number(url.searchParams.get("limit") || 25);
  const minutes = Number(url.searchParams.get("minutes") || 60);

  const resp = await fetch(`${origin}/api/email/gmail/sync?limit=${limit}&minutes=${minutes}`, {
    method: "POST",
    headers: { "x-pulse-cron-secret": secret },
    cache: "no-store",
  });

  const data = await resp.json().catch(() => ({}));
  return NextResponse.json({ ok: resp.ok, upstream_status: resp.status, ...data }, { status: resp.ok ? 200 : resp.status });
}

