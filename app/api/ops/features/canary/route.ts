// app/api/ops/features/canary/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { getCanary, listCanaryFeatureIds } from "@/lib/features/canaries";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { log } from "@/lib/obs/logger";
import { getRequestMeta } from "@/lib/obs/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * CI auth:
 * - If x-canary-ci-token matches process.env.CANARY_CI_TOKEN => allow without Clerk
 * - Otherwise require Clerk user
 */
function getAuthContext(req: NextRequest): { mode: "ci" | "clerk"; clerkUserId: string } | null {
  const token = req.headers.get("x-canary-ci-token") || "";
  const expected = process.env.CANARY_CI_TOKEN || "";

  if (expected && token && token === expected) {
    // CI mode; we still populate a stable "system" id for logging/evidence
    return { mode: "ci", clerkUserId: "ci-system" };
  }

  return null;
}

function limitConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let i = 0;

  return new Promise((resolve, reject) => {
    let active = 0;

    const next = () => {
      if (i >= items.length && active === 0) return resolve(results);

      while (active < limit && i < items.length) {
        const idx = i++;
        active++;
        fn(items[idx])
          .then((res) => {
            results[idx] = res;
            active--;
            next();
          })
          .catch(reject);
      }
    };

    next();
  });
}

async function persistRun(featureId: string, result: any) {
  // Writes canary run to feature_canary_runs (service role)
  // result JSON stored as-is for audit/debug.
  const ok = !!result?.ok;
  const severity = result?.severity || (ok ? "ok" : "fail");

  try {
    await supabaseAdmin.from("feature_canary_runs").insert({
      feature_id: featureId,
      ok,
      severity,
      result,
      created_at: new Date().toISOString(),
    });
  } catch (err: any) {
    log.warn("canary.persistence_failed", { feature_id: featureId, error: err?.message });
  }
}

async function fetchLatest() {
  // Get latest run per feature (simple approach: fetch recent N then reduce)
  const { data, error } = await supabaseAdmin
    .from("feature_canary_runs")
    .select("feature_id, ok, severity, result, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  const latest: Record<string, any> = {};
  for (const row of data || []) {
    if (!latest[row.feature_id]) {
      latest[row.feature_id] = {
        ...(row.result || {}),
        featureId: row.feature_id,
        ok: row.ok,
        severity: row.severity,
        createdAt: row.created_at,
      };
    }
  }

  return latest;
}

export async function POST(req: NextRequest) {
  const meta = getRequestMeta();
  const t0 = Date.now();
  log.info("route.start", { ...meta, route: "POST /api/ops/features/canary" });

  try {
    // Auth: CI token OR Clerk
    const ciAuth = getAuthContext(req);
    const clerkUserId = ciAuth ? ciAuth.clerkUserId : await requireClerkUserId();

    if (ciAuth) {
      log.info("route.ci_auth", { ...meta, route: "POST /api/ops/features/canary" });
    }

    const body = await req.json().catch(() => ({}));
    const featureId = body?.featureId as string | undefined;

    const featureIds = featureId ? [featureId] : listCanaryFeatureIds();

    const resultsArr = await limitConcurrency(featureIds, 4, async (fid) => {
      const fn = getCanary(fid);
      if (!fn) {
        const missing = {
          featureId: fid,
          ok: false,
          severity: "fail",
          checks: [
            {
              id: "missing_canary",
              label: "Canary exists",
              ok: false,
              details: "No canary registered for this featureId",
            },
          ],
          message: "No canary registered for this featureId.",
          createdAt: new Date().toISOString(),
        };
        await persistRun(fid, missing);
        return missing;
      }

      const res = await fn({ clerkUserId });
      // ensure createdAt and featureId exist
      const normalized = {
        featureId: fid,
        createdAt: new Date().toISOString(),
        ...res,
      };
      await persistRun(fid, normalized);
      return normalized;
    });

    const results = Object.fromEntries(resultsArr.map((r: any) => [r.featureId || r.feature_id, r]));

    const resultValues = Object.values(results) as any[];
    const failing = resultValues.filter((r) => !r.ok || r.severity === "fail");
    const summary = {
      total: resultValues.length,
      failing: failing.length,
      failingFeatureIds: failing.map((r) => r.featureId || r.feature_id),
    };

    log.info("route.ok", {
      ...meta,
      route: "POST /api/ops/features/canary",
      ms: Date.now() - t0,
      authMode: ciAuth ? "ci" : "clerk",
      ran: featureIds.length,
    });

    return NextResponse.json({
      ok: true,
      authMode: ciAuth ? "ci" : "clerk",
      ran: featureIds.length,
      summary,
      results,
    });
  } catch (err: any) {
    log.error("route.err", {
      ...meta,
      route: "POST /api/ops/features/canary",
      ms: Date.now() - t0,
      error: err?.message || String(err),
    });
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Canary run failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const meta = getRequestMeta();
  const t0 = Date.now();
  log.info("route.start", { ...meta, route: "GET /api/ops/features/canary" });

  try {
    // For viewing latest, we keep it readable (your migration said public read).
    // If you want this locked to Clerk only, say so and we'll gate it.
    const results = await fetchLatest();

    log.info("route.ok", {
      ...meta,
      route: "GET /api/ops/features/canary",
      ms: Date.now() - t0,
      count: Object.keys(results).length,
    });

    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    log.error("route.err", {
      ...meta,
      route: "GET /api/ops/features/canary",
      ms: Date.now() - t0,
      error: err?.message || String(err),
    });
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to load latest canary results" },
      { status: 500 }
    );
  }
}
