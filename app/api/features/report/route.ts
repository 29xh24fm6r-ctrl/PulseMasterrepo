import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { FEATURE_REGISTRY } from "@/lib/features/registry";
import { log } from "@/lib/obs/logger";
import { getRequestMeta } from "@/lib/obs/request-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const meta = getRequestMeta();
  const t0 = Date.now();
  log.info("route.start", { ...meta, route: "GET /api/features/report" });

  try {
    const { userId } = await auth();
    if (!userId) {
      log.warn("route.auth_failed", { ...meta, route: "GET /api/features/report", ms: Date.now() - t0 });
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const allMissing = [];
    const allUnowned = [];
    const allUnused = [];

    for (const f of FEATURE_REGISTRY) {
      const d = f.diagnostics;
      if (d?.missing_apis?.length) allMissing.push(...d.missing_apis);
      if (d?.unowned_calls?.length) allUnowned.push(...d.unowned_calls);
      if (d?.unused_defined_apis?.length) allUnused.push(...d.unused_defined_apis);
    }

    log.info("route.ok", { ...meta, route: "GET /api/features/report", ms: Date.now() - t0, missing: allMissing.length, unowned: allUnowned.length, unused: allUnused.length });
    return NextResponse.json({
      ok: true,
      missing_api_calls: allMissing,
      unowned_api_calls: allUnowned,
      unused_defined_apis: allUnused,
    });
  } catch (err: any) {
    log.error("route.err", { ...meta, route: "GET /api/features/report", ms: Date.now() - t0, error: err?.message || String(err) });
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}

