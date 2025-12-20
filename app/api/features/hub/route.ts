// src/app/api/features/hub/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { FEATURE_REGISTRY, type FeatureKey } from "@/lib/features/registry";
import { writeOpsEvent } from "@/lib/ops/incidents/writeEvent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TestResult = { ok: boolean; detail?: string | null; meta?: any };
type Readiness = "ready" | "degraded" | "blocked";

const TEST_FRESHNESS_HOURS = 24;

async function bestEffortRunTest(feature: FeatureKey): Promise<TestResult> {
  try {
    const sb = supabaseAdmin();

    // Basic "can I read 1 row" probes for the feature's core table.
    const tableByFeature: Partial<Record<FeatureKey, string>> = {
      contacts: "crm_contacts",
      tasks: "tasks",
      deals: "deals",
      journal: "journal_entries",
      habits: "habits",
      intelligence: "intel_runs",
      notifications: "reminder_subscriptions",
      simulation: "simulation_runs",
    };

    const table = tableByFeature[feature];
    if (!table) return { ok: false, detail: "no_test_defined" };

    const { error } = await sb.from(table as any).select("*", { count: "exact", head: true }).limit(1);
    if (error) return { ok: false, detail: error.message };

    return { ok: true };
  } catch (e: any) {
    return { ok: false, detail: String(e?.message || e) };
  }
}

async function getLastTestEvents() {
  const sb = supabaseAdmin();

  const { data, error } = await sb
    .from("ops_incident_events")
    .select("created_at, event_type, payload")
    .in("event_type", ["feature_test_passed", "feature_test_failed"])
    .order("created_at", { ascending: false })
    .limit(800);

  if (error) return { ok: false as const, error: error.message, rows: [] as any[] };
  return { ok: true as const, error: null, rows: data ?? [] };
}

function pickLast(rows: any[], featureKey: string) {
  for (const r of rows) {
    const fk = r?.payload?.featureKey;
    if (fk === featureKey) return r;
  }
  return null;
}

function hoursSince(iso: string | null) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const ms = Date.now() - t;
  return ms / (1000 * 60 * 60);
}

function envMissing(keys: string[]) {
  const missing: string[] = [];
  for (const k of keys) {
    if (!k) continue;
    const v = process.env[k];
    if (!v) missing.push(k);
  }
  return missing;
}

function looksLikeMissingTable(errMsg: string) {
  const s = (errMsg || "").toLowerCase();
  return (
    s.includes("does not exist") ||
    (s.includes("relation") && s.includes("does not exist")) ||
    s.includes("42p01")
  );
}

async function checkTableReadable(table: string): Promise<{ ok: boolean; detail?: string | null }> {
  try {
    const sb = supabaseAdmin();
    const { error } = await sb.from(table as any).select("*", { head: true, count: "exact" }).limit(1);
    if (!error) return { ok: true };

    const msg = error.message || "table_probe_failed";
    if (looksLikeMissingTable(msg)) return { ok: false, detail: `missing_table:${table}` };
    return { ok: false, detail: `table_unreadable:${table}:${msg}` };
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (looksLikeMissingTable(msg)) return { ok: false, detail: `missing_table:${table}` };
    return { ok: false, detail: `table_probe_error:${table}:${msg}` };
  }
}

async function computeReadiness(args: {
  feature: { key: string; testable: boolean; readiness?: { requiresTables?: string[]; requiresEnv?: string[] } };
  lastStatus: "pass" | "fail" | "unknown";
  lastOk: string | null;
  prodIsRed: boolean;
}): Promise<{ readiness: Readiness; reasons: string[] }> {
  const reasons: string[] = [];
  const spec = args.feature.readiness || {};
  const reqTables = (spec.requiresTables || []).filter(Boolean);
  const reqEnv = (spec.requiresEnv || []).filter(Boolean);

  // Hard blockers: missing env or tables
  const missEnv = envMissing(reqEnv);
  if (missEnv.length) reasons.push(`missing_env:${missEnv.join(",")}`);

  for (const t of reqTables) {
    const res = await checkTableReadable(t);
    if (!res.ok) reasons.push(res.detail || `table_check_failed:${t}`);
  }

  const blocked = reasons.some((r) => r.startsWith("missing_env:") || r.startsWith("missing_table:"));

  // Degrade conditions (non-blocking but important)
  if (args.prodIsRed) reasons.push("prod_health:red");

  if (args.feature.testable) {
    if (args.lastStatus === "fail") reasons.push("last_test:fail");

    const ageH = hoursSince(args.lastOk);
    if (args.lastStatus !== "pass") {
      // unknown/fail already handled; but unknown counts as stale too
      if (args.lastStatus === "unknown") reasons.push("last_test:unknown");
    }
    if (ageH !== null && ageH > TEST_FRESHNESS_HOURS) {
      reasons.push(`last_ok_stale:${Math.round(ageH)}h`);
    }
    if (args.lastOk === null) {
      reasons.push("no_last_ok");
    }
  }

  if (blocked) return { readiness: "blocked", reasons };

  // If anything "bad" exists, we degrade; otherwise ready
  const hasDegradeSignal = reasons.length > 0;
  return { readiness: hasDegradeSignal ? "degraded" : "ready", reasons };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const runTests = url.searchParams.get("runTests") === "1";

  // Best-effort prod signal: if War Room exists and it's red, we degrade features (not block).
  // We infer from ops_incident_events smoke events to avoid coupling to War Room API.
  const sb = supabaseAdmin();
  const { data: smokeEvents } = await sb
    .from("ops_incident_events")
    .select("created_at, event_type")
    .in("event_type", ["smoke_passed", "smoke_failed"])
    .order("created_at", { ascending: false })
    .limit(25);

  const smoke = smokeEvents ?? [];
  const latestSmokePass = smoke.find((e) => e.event_type === "smoke_passed") ?? null;
  const latestSmokeFail = smoke.find((e) => e.event_type === "smoke_failed") ?? null;
  const prodIsRed = Boolean(
    latestSmokeFail && (!latestSmokePass || String(latestSmokeFail.created_at) > String(latestSmokePass.created_at))
  );

  const last = await getLastTestEvents();

  const base = FEATURE_REGISTRY.map((f) => {
    const lastEvt = last.ok ? pickLast(last.rows, f.key) : null;
    const lastOk = lastEvt?.event_type === "feature_test_passed" ? lastEvt.created_at : null;
    const lastFail = lastEvt?.event_type === "feature_test_failed" ? lastEvt.created_at : null;

    return {
      ...f,
      lastOk,
      lastFail,
      lastStatus: lastEvt?.event_type
        ? lastEvt.event_type === "feature_test_passed"
          ? "pass"
          : "fail"
        : "unknown",
    };
  });

  if (!runTests) {
    const withReadiness = [];

    for (const f of base) {
      const g = await computeReadiness({
        feature: f,
        lastStatus: f.lastStatus,
        lastOk: f.lastOk,
        prodIsRed,
      });
      withReadiness.push({ ...f, readiness: g.readiness, reasons: g.reasons });
    }

    return NextResponse.json({
      ok: true,
      features: withReadiness,
      prod: { status: prodIsRed ? "red" : "green_or_unknown" },
      note: last.ok ? null : last.error,
    });
  }

  // Run tests + write events
  for (const f of FEATURE_REGISTRY) {
    if (!f.testable) continue;

    const r = await bestEffortRunTest(f.key);
    await writeOpsEvent({
      event_type: r.ok ? "feature_test_passed" : "feature_test_failed",
      level: r.ok ? "success" : "warn",
      summary: r.ok ? `Feature test passed: ${f.key}` : `Feature test failed: ${f.key}`,
      payload: { featureKey: f.key, detail: r.detail ?? null },
    });
  }

  // Rebuild with updated last statuses + readiness
  const last2 = await getLastTestEvents();

  const mergedBase = FEATURE_REGISTRY.map((f) => {
    const lastEvt = last2.ok ? pickLast(last2.rows, f.key) : null;
    const lastOk = lastEvt?.event_type === "feature_test_passed" ? lastEvt.created_at : null;
    const lastFail = lastEvt?.event_type === "feature_test_failed" ? lastEvt.created_at : null;
    return {
      ...f,
      lastOk,
      lastFail,
      lastStatus: lastEvt?.event_type
        ? lastEvt.event_type === "feature_test_passed"
          ? "pass"
          : "fail"
        : "unknown",
    };
  });

  const withReadiness = [];
  for (const f of mergedBase) {
    const g = await computeReadiness({
      feature: f,
      lastStatus: f.lastStatus,
      lastOk: f.lastOk,
      prodIsRed,
    });
    withReadiness.push({ ...f, readiness: g.readiness, reasons: g.reasons });
  }

  return NextResponse.json({
    ok: true,
    features: withReadiness,
    ran: true,
    prod: { status: prodIsRed ? "red" : "green_or_unknown" },
  });
}
