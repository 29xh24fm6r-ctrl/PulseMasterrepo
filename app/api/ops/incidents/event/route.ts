// src/app/api/ops/incidents/event/route.ts
import { NextResponse } from "next/server";
import { writeOpsEvent } from "@/lib/ops/incidents/writeEvent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GitHub Actions -> War Room ingest
 * Auth: Header x-ops-token must match process.env.OPS_EVENTS_TOKEN
 */
export async function POST(req: Request) {
  try {
    const token = req.headers.get("x-ops-token") || "";
    const expected = process.env.OPS_EVENTS_TOKEN || "";

    if (!expected || token !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      incident_id = null,
      source,
      event_type,
      level = "info",
      summary,
      link = null,
      payload = {},
    } = body || {};

    if (!source || !event_type || !summary) {
      return NextResponse.json(
        { ok: false, error: "source, event_type, summary are required" },
        { status: 400 }
      );
    }

    await writeOpsEvent({ incident_id, source, event_type, level, summary, link, payload });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}

