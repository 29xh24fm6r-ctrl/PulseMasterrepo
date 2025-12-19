import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { FEATURE_REGISTRY } from "@/lib/features/registry";
import { log } from "@/lib/obs/logger";
import { getRequestMeta } from "@/lib/obs/request-context";
import { getAccessContext } from "@/lib/access/context";
import { evalGate } from "@/lib/access/gates";

type HealthRow = {
  id: string;
  name: string;
  group: string;
  status: string;
  links: { label: string; href: string }[];
  apis: { method: string; path: string; ok: boolean; status?: number; error?: string }[];
  ok: boolean;
  locked?: boolean;
  lockedReason?: string;
};

function normalizeApiPathForPing(path: string) {
  // Replace common params with a harmless placeholder
  return path.replace("/:id", "/__id__").replace(":id", "__id__");
}

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const meta = getRequestMeta();
  const t0 = Date.now();
  log.info("route.start", { ...meta, route: "GET /api/features/health" });

  try {
    const { userId } = await auth();
    if (!userId) {
      log.warn("route.auth_failed", { ...meta, route: "GET /api/features/health", ms: Date.now() - t0 });
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const ping = url.searchParams.get("ping") === "1"; // optional
    const base = url.origin;

    // Get access context for gate evaluation
    const ctx = await getAccessContext();

    const rows: HealthRow[] = [];

    for (const f of FEATURE_REGISTRY) {
      // Evaluate gate
      const gateResult = evalGate(f.gate, ctx);
      const apis = f.apis || [];
      const apiChecks = [];

      for (const api of apis) {
        // default: "present" only (we assume it exists if registered)
        // optional: ping if requested AND api.ping true
        if (ping && api.ping) {
          const pingPath = normalizeApiPathForPing(api.path);
          try {
            const res = await fetch(`${base}${pingPath}`, {
              method: api.method,
              headers: { "content-type": "application/json" },
              // For POST pings, send minimal body
              body: api.method === "POST" ? JSON.stringify({ __ping: true }) : undefined,
              cache: "no-store",
            });
            apiChecks.push({
              method: api.method,
              path: api.path,
              ok: res.ok || res.status === 401, // 401 is OK (auth required, but route exists)
              status: res.status,
            });
          } catch (e: any) {
            apiChecks.push({
              method: api.method,
              path: api.path,
              ok: false,
              error: e?.message || "Ping failed",
            });
          }
        } else {
          apiChecks.push({
            method: api.method,
            path: api.path,
            ok: true, // registry-level check only
          });
        }
      }

      const ok = apiChecks.every((x: any) => x.ok) && gateResult.ok;
      const locked = !gateResult.ok;
      const lockedReason = locked ? (f.locked_copy || (gateResult.ok === false ? gateResult.reason : "Not allowed")) : undefined;

      rows.push({
        id: f.id,
        name: f.name,
        group: f.group,
        status: f.status,
        links: f.links,
        apis: apiChecks,
        observed_apis: f.observed_apis || [],
        diagnostics: f.diagnostics || {},
        locked,
        lockedReason,
        ok,
      });
    }

    const allOk = rows.every((r) => r.ok);

    log.info("route.ok", { ...meta, route: "GET /api/features/health", ms: Date.now() - t0, allOk, count: rows.length });
    return NextResponse.json({ ok: allOk, features: rows });
  } catch (err: any) {
    log.error("route.err", { ...meta, route: "GET /api/features/health", ms: Date.now() - t0, error: err?.message || String(err) });
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}

