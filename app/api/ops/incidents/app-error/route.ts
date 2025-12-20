// src/app/api/ops/incidents/app-error/route.ts
import { NextResponse } from "next/server";
import { writeOpsEvent } from "@/lib/ops/incidents/writeEvent";
import { requireClerkUserId } from "@/lib/auth/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory per-user rate limit (good enough; can move to Redis later)
const bucket = new Map<string, { count: number; resetAt: number }>();

function rateLimitOk(userId: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const cur = bucket.get(userId);
  if (!cur || now > cur.resetAt) {
    bucket.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (cur.count >= limit) return false;
  cur.count += 1;
  return true;
}

/**
 * Client/server error ingest -> ops_incident_events
 * Auth: Clerk user required
 */
export async function POST(req: Request) {
  try {
    const userId = await requireClerkUserId();

    if (!rateLimitOk(userId)) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      message = "Unknown error",
      name = null,
      stack = null,
      href = null,
      route = null,
      componentStack = null,
      runtime = null, // "client" | "server"
      meta = {},
    } = body || {};

    const summary = `${runtime || "app"} error: ${String(message).slice(0, 160)}`;

    await writeOpsEvent({
      source: "app",
      event_type: "app_error",
      level: "error",
      summary,
      link: href || null,
      payload: {
        userId,
        name,
        message,
        stack,
        componentStack,
        route,
        href,
        runtime,
        meta,
        capturedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}

