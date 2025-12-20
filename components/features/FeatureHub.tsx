// src/components/features/FeatureHub.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type FeatureRow = {
  key: string;
  title: string;
  description: string;
  href: string;
  testable: boolean;

  lastOk: string | null;
  lastFail: string | null;
  lastStatus: "pass" | "fail" | "unknown";

  readiness: "ready" | "degraded" | "blocked";
  reasons: string[];
};

function fmt(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

function statusBadge(status: FeatureRow["lastStatus"]) {
  if (status === "pass") return "bg-green-500/15 text-green-700 border-green-500/30";
  if (status === "fail") return "bg-red-500/15 text-red-700 border-red-500/30";
  return "bg-blue-500/10 text-blue-700 border-blue-500/20";
}

function readinessBadge(r: FeatureRow["readiness"]) {
  if (r === "ready") return "bg-green-500/15 text-green-700 border-green-500/30";
  if (r === "blocked") return "bg-red-500/15 text-red-700 border-red-500/30";
  return "bg-yellow-500/15 text-yellow-700 border-yellow-500/30";
}

function humanizeReason(s: string) {
  if (s.startsWith("missing_env:")) return `Missing env: ${s.replace("missing_env:", "")}`;
  if (s.startsWith("missing_table:")) return `Missing table: ${s.replace("missing_table:", "")}`;
  if (s.startsWith("table_unreadable:")) return `Table unreadable: ${s.replace("table_unreadable:", "")}`;
  if (s.startsWith("table_probe_error:")) return `Table probe error: ${s.replace("table_probe_error:", "")}`;
  if (s === "prod_health:red") return "Prod health is RED";
  if (s === "last_test:fail") return "Last test failed";
  if (s === "last_test:unknown") return "No test history yet";
  if (s.startsWith("last_ok_stale:")) return `Last OK is stale (${s.replace("last_ok_stale:", "")})`;
  if (s === "no_last_ok") return "No successful test recorded yet";
  return s;
}

function parseMissingEnv(reason: string): string[] {
  if (!reason.startsWith("missing_env:")) return [];
  const list = reason.replace("missing_env:", "").trim();
  if (!list) return [];
  return list
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseMissingTable(reason: string): string[] {
  if (!reason.startsWith("missing_table:")) return [];
  const t = reason.replace("missing_table:", "").trim();
  return t ? [t] : [];
}

function escapeForRg(s: string) {
  // ripgrep uses Rust regex; escape common regex metacharacters
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildMigrationSearchHints(tables: string[]) {
  // We intentionally search both common migration roots:
  // - supabase/migrations (Supabase CLI default)
  // - migrations (custom)
  // - src (sometimes SQL embedded or referenced)
  const roots = ["supabase/migrations", "migrations", "src"];

  const lines: string[] = [];
  lines.push("# Search for table name references (broad)");
  for (const table of tables) {
    const pat = escapeForRg(table);
    lines.push(`rg -n "${pat}" ${roots.join(" ")} -S`);
  }

  lines.push("");
  lines.push("# Search for CREATE TABLE statements (narrow)");
  for (const table of tables) {
    const pat = escapeForRg(table);
    // tolerate schema-qualified + optional IF NOT EXISTS + whitespace
    lines.push(`rg -n "create\\s+table\\s+(if\\s+not\\s+exists\\s+)?(public\\.)?${pat}\\b" ${roots.join(" ")} -S -i`);
  }

  lines.push("");
  lines.push("# If you expect an RPC/view referencing it");
  for (const table of tables) {
    const pat = escapeForRg(table);
    lines.push(`rg -n "(from|join)\\s+(public\\.)?${pat}\\b" ${roots.join(" ")} -S -i`);
  }

  return lines.join("\n");
}

function buildFixActions(f: FeatureRow) {
  const actions: Array<
    | { kind: "runTests"; label: string; title?: string }
    | { kind: "copy"; label: string; value: string; title?: string }
    | { kind: "open"; label: string; href: string; title?: string }
  > = [];

  const reasons = f.reasons || [];
  const missingEnvs = reasons.flatMap(parseMissingEnv);
  const missingTables = reasons.flatMap(parseMissingTable);

  // 1) Missing env vars → copy block
  if (missingEnvs.length) {
    actions.push({
      kind: "copy",
      label: `Copy missing env (${missingEnvs.length})`,
      value: missingEnvs.join("\n"),
      title: "Copy env var names to clipboard (set locally + in Vercel)",
    });
    actions.push({
      kind: "copy",
      label: "Copy .env template lines",
      value: missingEnvs.map((k) => `${k}=`).join("\n"),
      title: "Paste into .env.local as a starting point",
    });
  }

  // 2) Missing tables → copy names + migration search hints
  if (missingTables.length) {
    actions.push({
      kind: "copy",
      label: `Copy missing tables (${missingTables.length})`,
      value: missingTables.join("\n"),
      title: "Copy required table names (so you can find/create the migrations)",
    });

    actions.push({
      kind: "copy",
      label: "Copy migration search (rg)",
      value: buildMigrationSearchHints(missingTables),
      title: "Copy ripgrep commands to locate existing migrations/SQL references",
    });

    actions.push({
      kind: "open",
      label: "Open Supabase (dashboard)",
      href: "https://app.supabase.com",
      title: "Go to Database → Tables / SQL Editor",
    });
  }

  // 3) If test is unknown/fail/stale → run tests
  const needsTest =
    reasons.includes("last_test:unknown") ||
    reasons.includes("last_test:fail") ||
    reasons.some((r) => r.startsWith("last_ok_stale:")) ||
    reasons.includes("no_last_ok");

  if (f.testable && needsTest) {
    actions.push({
      kind: "runTests",
      label: "Run tests now",
      title: "Runs deterministic probes and records results",
    });
  }

  // 4) If degraded due to prod red → open War Room
  if (reasons.includes("prod_health:red")) {
    actions.push({
      kind: "open",
      label: "Open War Room",
      href: "/ops/incidents",
      title: "Go to incident control plane",
    });
  }

  // 5) Always allow copying feature key
  actions.push({ kind: "copy", label: "Copy feature key", value: f.key });

  return actions.slice(0, 6);
}

export default function FeatureHub() {
  const [rows, setRows] = useState<FeatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const r = await fetch("/api/features/hub", { cache: "no-store" });
      const j = await r.json();
      if (!j?.ok) throw new Error(j?.error || "hub_fetch_failed");
      setRows(j.features || []);
    } catch (e: any) {
      setErr(e?.message ?? "unknown_error");
    } finally {
      setLoading(false);
    }
  }

  async function runAll() {
    setErr(null);
    setRunning(true);
    try {
      const r = await fetch("/api/features/hub?runTests=1", { cache: "no-store" });
      const j = await r.json();
      if (!j?.ok) throw new Error(j?.error || "hub_run_failed");
      setRows(j.features || []);
    } catch (e: any) {
      setErr(e?.message ?? "unknown_error");
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const sorted = useMemo(() => {
    // Blocked first, then degraded, then ready
    const rank = (r: FeatureRow["readiness"]) => (r === "blocked" ? 0 : r === "degraded" ? 1 : 2);
    return rows.slice().sort((a, b) => rank(a.readiness) - rank(b.readiness));
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border p-5 bg-background shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-semibold">Feature Hub</div>
            <div className="text-sm text-muted-foreground">
              Readiness gates + click-to-fix: if it's blocked, the UI tells you how to unblock it (including migration search hints).
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-xl border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
              onClick={load}
              disabled={loading}
            >
              Refresh
            </button>
            <button
              className="rounded-xl border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
              onClick={runAll}
              disabled={running}
              title="Runs deterministic probes and logs results to ops_incident_events"
            >
              {running ? "Running…" : "Run All Tests"}
            </button>
          </div>
        </div>

        {err ? <div className="mt-3 text-sm text-red-600">Error: {err}</div> : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sorted.map((f) => {
          const openBlocked = f.readiness === "blocked";
          const reasonText = (f.reasons || []).map(humanizeReason).join(" • ");
          const fixes = buildFixActions(f);

          return (
            <div key={f.key} className="rounded-2xl border p-4 bg-background shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs border rounded-full px-2 py-0.5 ${readinessBadge(f.readiness)}`}>
                      {f.readiness.toUpperCase()}
                    </span>
                    <span className={`text-xs border rounded-full px-2 py-0.5 ${statusBadge(f.lastStatus)}`}>
                      TEST {f.lastStatus.toUpperCase()}
                    </span>
                    <div className="font-semibold truncate">{f.title}</div>
                  </div>

                  <div className="text-sm text-muted-foreground mt-1">{f.description}</div>

                  {f.reasons?.length ? (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-semibold">Why:</span> {reasonText}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-muted-foreground">Why: —</div>
                  )}
                </div>

                {openBlocked ? (
                  <button
                    className="rounded-xl border px-3 py-2 text-sm opacity-50 cursor-not-allowed whitespace-nowrap"
                    disabled
                    title={reasonText || "Feature blocked"}
                  >
                    Blocked
                  </button>
                ) : (
                  <a
                    href={f.href}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-muted whitespace-nowrap"
                    title={f.readiness === "degraded" ? `Degraded: ${reasonText}` : "Open feature"}
                  >
                    Open
                  </a>
                )}
              </div>

              <div className="mt-3 text-xs text-muted-foreground">
                <div>Last OK: {fmt(f.lastOk)}</div>
                <div>Last Fail: {fmt(f.lastFail)}</div>
              </div>

              {/* Click-to-fix panel */}
              <div className="mt-4 rounded-2xl border p-3">
                <div className="text-sm font-semibold">Click to fix</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {fixes.map((a, idx) => {
                    if (a.kind === "runTests") {
                      return (
                        <button
                          key={idx}
                          className="rounded-xl border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                          onClick={runAll}
                          disabled={running}
                          title={a.title || ""}
                        >
                          {running ? "Running…" : a.label}
                        </button>
                      );
                    }

                    if (a.kind === "open") {
                      return (
                        <a
                          key={idx}
                          className="rounded-xl border px-3 py-2 text-sm hover:bg-muted"
                          href={a.href}
                          title={a.title || ""}
                        >
                          {a.label}
                        </a>
                      );
                    }

                    // copy
                    return (
                      <button
                        key={idx}
                        className="rounded-xl border px-3 py-2 text-sm hover:bg-muted"
                        onClick={() => navigator.clipboard.writeText(a.value)}
                        title={a.title || "Copy to clipboard"}
                      >
                        {a.label}
                      </button>
                    );
                  })}
                </div>

                {f.reasons?.length ? (
                  <details className="mt-3">
                    <summary className="text-xs text-muted-foreground cursor-pointer">Show raw gate codes</summary>
                    <div className="mt-2 text-xs font-mono text-muted-foreground break-all">{JSON.stringify(f.reasons)}</div>
                  </details>
                ) : null}
              </div>

              <div id={`feature-${f.key}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
