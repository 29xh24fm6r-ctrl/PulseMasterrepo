import "server-only";
import { NextResponse } from "next/server";
import { getAccessContext } from "@/lib/access/context";
import { log } from "@/lib/obs/logger";
import { getRequestMeta } from "@/lib/obs/request-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const meta = getRequestMeta();
  const t0 = Date.now();
  log.info("route.start", { ...meta, route: "GET /api/access/me" });

  try {
    const ctx = await getAccessContext();
    log.info("route.ok", { ...meta, route: "GET /api/access/me", ms: Date.now() - t0, isAuthed: ctx.isAuthed });
    return NextResponse.json({ ok: true, ctx });
  } catch (err: any) {
    log.error("route.err", { ...meta, route: "GET /api/access/me", ms: Date.now() - t0, error: err?.message || String(err) });
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}

