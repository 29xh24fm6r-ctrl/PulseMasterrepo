import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * UI-safe flush proxy:
 * - requires auth (Clerk)
 * - only enabled when EMAIL_FLUSH_UI_ENABLED=true
 * - injects EMAIL_FLUSH_SECRET server-side (never exposed to browser)
 * - forwards to /api/email/outbox/flush
 */
export async function POST(req: Request) {
  if (process.env.EMAIL_FLUSH_UI_ENABLED !== "true") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") || 10)));

  const origin = url.origin;
  const secret = process.env.EMAIL_FLUSH_SECRET;

  const resp = await fetch(`${origin}/api/email/outbox/flush?limit=${limit}`, {
    method: "POST",
    headers: {
      ...(secret ? { "x-pulse-flush-secret": secret } : {}),
      "x-pulse-worker-id": `ui_${userId}_${Date.now()}`,
    },
    cache: "no-store",
  });

  const data = await resp.json().catch(() => ({}));

  return NextResponse.json(
    {
      ok: resp.ok,
      upstream_status: resp.status,
      ...data,
    },
    { status: resp.ok ? 200 : resp.status }
  );
}

