// app/ops/features/page.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";

type CanaryFixHint = {
  kind?: string;
  summary?: string;
  nextSteps?: string[];
  filePaths?: string[];
};

type CanaryCheck = {
  id: string;
  label: string;
  ok: boolean;
  details?: string;
  error?: string;
  fixHint?: CanaryFixHint;
};

type CanaryResult = {
  featureId: string;
  ok: boolean;
  severity?: "ok" | "warn" | "fail";
  checks: CanaryCheck[];
  createdAt?: string;
  lastOkAt?: string;
  message?: string;
};

type CanaryRunRow = {
  id: string;
  featureId: string;
  ok: boolean;
  severity: "ok" | "warn" | "fail";
  createdAt: string;
  result?: any;
};

type AutopilotIssue = {
  ok: boolean;
  found: boolean;
  url: string | null;
  number: number | null;
  state: string;
  updatedAt: string | null;
  title?: string;
  error?: string;
};

function pillClassBySeverity(sev: "ok" | "warn" | "fail") {
  if (sev === "ok") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (sev === "warn") return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  return "bg-rose-500/15 text-rose-300 border-rose-500/30";
}

function pillClass(ok: boolean) {
  return ok
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : "bg-rose-500/15 text-rose-300 border-rose-500/30";
}

function fmt(ts?: string) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function safeArray<T>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

export default function OpsFeaturesPage() {
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Record<string, CanaryResult>>({});
  const [err, setErr] = useState<string | null>(null);
  const [showOnlyBroken, setShowOnlyBroken] = useState(false);

  // Feed
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedErr, setFeedErr] = useState<string | null>(null);
  const [runs, setRuns] = useState<CanaryRunRow[]>([]);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  // Autopilot Issue discovery
  const [issueLoading, setIssueLoading] = useState(true);
  const [issue, setIssue] = useState<AutopilotIssue | null>(null);

  async function loadLatest() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/ops/features/canary", { method: "GET" });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Failed to load latest canary results");

      const transformed: Record<string, CanaryResult> = {};
      for (const [fid, data] of Object.entries(json.results || {})) {
        const d = data as any;
        const resultObj = d?.result ?? d;

        transformed[fid] = {
          featureId: fid,
          ok: !!(resultObj?.ok ?? d?.ok ?? false),
          severity: (resultObj?.severity ?? d?.severity) as any,
          checks: safeArray<CanaryCheck>(resultObj?.checks ?? d?.checks),
          createdAt: resultObj?.createdAt ?? d?.createdAt ?? d?.created_at ?? null,
          lastOkAt: d?.lastOkAt ?? d?.lastOk ?? null,
          message: resultObj?.message ?? d?.message,
        };
      }

      setResults(transformed);
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function loadFeed(limit = 10) {
    setFeedLoading(true);
    setFeedErr(null);
    try {
      const res = await fetch(`/api/ops/features/canary/runs?limit=${limit}`, { method: "GET" });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Failed to load canary run feed");
      setRuns(safeArray<CanaryRunRow>(json.runs));
    } catch (e: any) {
      setFeedErr(e?.message || "Failed to load canary run feed");
    } finally {
      setFeedLoading(false);
    }
  }

  async function loadAutopilotIssue() {
    setIssueLoading(true);
    try {
      const res = await fetch("/api/ops/features/autopilot-issue", { method: "GET" });
      const json = await res.json();
      if (!json?.ok) {
        setIssue({
          ok: false,
          found: false,
          url: null,
          number: null,
          state: "unknown",
          updatedAt: null,
          error: json?.error || "Failed to discover issue",
        });
        return;
      }
      setIssue(json as AutopilotIssue);
    } catch (e: any) {
      setIssue({
        ok: false,
        found: false,
        url: null,
        number: null,
        state: "unknown",
        updatedAt: null,
        error: e?.message || "Failed to discover issue",
      });
    } finally {
      setIssueLoading(false);
    }
  }

  async function runAll() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/ops/features/canary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Failed to run canaries");

      const transformed: Record<string, CanaryResult> = {};
      for (const [fid, data] of Object.entries(json.results || {})) {
        const d = data as any;
        transformed[fid] = {
          featureId: fid,
          ok: !!d.ok,
          severity: d.severity,
          checks: safeArray<CanaryCheck>(d.checks),
          createdAt: d.createdAt || new Date().toISOString(),
          lastOkAt: d.ok ? new Date().toISOString() : null,
          message: d.message,
        };
      }
      setResults(transformed);

      // refresh everything after a run
      await Promise.all([loadFeed(10), loadAutopilotIssue()]);
    } catch (e: any) {
      setErr(e?.message || "Failed to run canaries");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadLatest();
    loadFeed(10);
    loadAutopilotIssue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => {
    const arr = Object.values(results || {});
    const filtered = showOnlyBroken ? arr.filter((r) => !r.ok) : arr;

    return filtered.sort((a, b) => {
      if (a.ok !== b.ok) return a.ok ? 1 : -1;
      return (a.featureId || "").localeCompare(b.featureId || "");
    });
  }, [results, showOnlyBroken]);

  const counts = useMemo(() => {
    const arr = Object.values(results || {});
    const fail = arr.filter((r) => !r.ok).length;
    const ok = arr.filter((r) => r.ok).length;
    return { ok, fail, total: arr.length };
  }, [results]);

  const brokenNow = counts.fail > 0;

  function renderRunDetails(run: CanaryRunRow) {
    const result = run.result || {};
    const checks = safeArray<any>(result.checks);
    const failed = checks.filter((c: any) => c && c.ok === false);

    if (!checks.length) {
      return <div className="text-xs text-zinc-400">No check details found in stored result JSON.</div>;
    }

    return (
      <div className="space-y-2">
        {failed.length === 0 ? (
          <div className="text-xs text-emerald-200">All checks passed.</div>
        ) : (
          failed.slice(0, 10).map((c: any) => (
            <div key={c.id || c.label} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
              <div className="text-sm font-semibold text-white">{c.label || c.id}</div>
              {(c.details || c.error) ? (
                <div className="mt-1 text-xs text-zinc-400">{c.details || c.error}</div>
              ) : null}

              {c.fixHint ? (
                <div className="mt-2 rounded border border-amber-500/20 bg-amber-500/10 p-2">
                  <div className="text-xs font-semibold text-amber-200">
                    Fix hint{c.fixHint.kind ? ` · ${c.fixHint.kind}` : ""}
                  </div>
                  {c.fixHint.summary ? (
                    <div className="mt-1 text-xs text-amber-100/90">{c.fixHint.summary}</div>
                  ) : null}
                  {safeArray<string>(c.fixHint.nextSteps).length ? (
                    <ul className="mt-2 list-disc pl-5 text-xs text-amber-100/80 space-y-1">
                      {safeArray<string>(c.fixHint.nextSteps).slice(0, 6).map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  ) : null}
                  {safeArray<string>(c.fixHint.filePaths).length ? (
                    <div className="mt-2 text-xs text-amber-100/70">
                      Files: {safeArray<string>(c.fixHint.filePaths).join(", ")}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Ops · Features</h1>
            <div className="mt-1 text-sm text-zinc-400">
              Live canary health + recent run feed + autopilot issue discovery.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                loadLatest();
                loadFeed(10);
                loadAutopilotIssue();
              }}
              disabled={loading || feedLoading || issueLoading}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700 disabled:opacity-50"
            >
              {loading || feedLoading || issueLoading ? "Loading..." : "Refresh"}
            </button>
            <button
              onClick={runAll}
              disabled={busy}
              className="rounded-lg border border-emerald-700 bg-emerald-900/30 px-3 py-2 text-sm hover:bg-emerald-900/50 disabled:opacity-50 text-emerald-200"
            >
              {busy ? "Running..." : "Run all canaries"}
            </button>
          </div>
        </div>

        {/* Status + Autopilot Issue */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 lg:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Current status</div>
                <div
                  className={`mt-2 inline-flex items-center rounded-full border px-3 py-1 text-xs ${
                    brokenNow ? pillClass(false) : pillClass(true)
                  }`}
                >
                  {brokenNow ? "BROKEN NOW" : "ALL GREEN"}
                </div>
              </div>

              <div className="text-right">
                {issueLoading ? (
                  <div className="text-xs text-zinc-400">Finding autopilot issue…</div>
                ) : issue?.ok === false ? (
                  <div className="text-xs text-rose-200">
                    Autopilot issue lookup failed
                    <div className="text-[11px] text-zinc-400 mt-1">{issue?.error || "—"}</div>
                  </div>
                ) : issue?.found && issue?.url ? (
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 hover:bg-zinc-700 text-zinc-200 inline-flex items-center gap-2"
                  >
                    Open Autopilot Issue →
                  </a>
                ) : (
                  <div className="text-xs text-zinc-400">
                    No open autopilot issue
                    <div className="text-[11px] text-zinc-500 mt-1">
                      (Means nightly autopilot is currently green)
                    </div>
                  </div>
                )}
                {issue?.updatedAt ? (
                  <div className="text-[11px] text-zinc-500 mt-2">
                    Issue updated: {fmt(issue.updatedAt)}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="text-xs rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1">
                Total: <span className="font-semibold">{counts.total}</span>
              </div>
              <div className="text-xs rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                OK: <span className="font-semibold">{counts.ok}</span>
              </div>
              <div className="text-xs rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-rose-200">
                Fail: <span className="font-semibold">{counts.fail}</span>
              </div>

              <label className="ml-auto flex items-center gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={showOnlyBroken}
                  onChange={(e) => setShowOnlyBroken(e.target.checked)}
                  className="rounded"
                />
                Show only broken
              </label>
            </div>

            {err ? (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                {err}
              </div>
            ) : null}
          </div>

          {/* Feed */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="text-sm font-semibold">Recent runs</div>
            <div className="mt-1 text-xs text-zinc-400">Last 10 canary results from the DB.</div>

            {feedErr ? (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                {feedErr}
              </div>
            ) : null}

            <div className="mt-3 space-y-2">
              {feedLoading ? (
                <div className="text-sm text-zinc-400">Loading feed…</div>
              ) : runs.length === 0 ? (
                <div className="text-sm text-zinc-400">No runs found yet.</div>
              ) : (
                runs.map((r) => {
                  const label = r.ok && r.severity === "ok" ? "OK" : r.severity.toUpperCase();
                  const expanded = expandedRunId === r.id;

                  return (
                    <div key={r.id} className="rounded-lg border border-zinc-800 bg-zinc-950/30">
                      <button
                        onClick={() => setExpandedRunId(expanded ? null : r.id)}
                        className="w-full text-left p-3 hover:bg-zinc-900/40 rounded-lg"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">{r.featureId}</div>
                            <div className="text-xs text-zinc-400">{fmt(r.createdAt)}</div>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${pillClassBySeverity(
                              r.severity
                            )}`}
                          >
                            {label}
                          </span>
                        </div>
                      </button>

                      {expanded ? (
                        <div className="border-t border-zinc-800 p-3">{renderRunDetails(r)}</div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Latest status table */}
        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/50">
          <div className="grid grid-cols-12 gap-2 bg-zinc-800/50 px-3 py-2 text-xs text-zinc-400">
            <div className="col-span-3">Feature</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Last Run</div>
            <div className="col-span-4">Top Failure</div>
          </div>

          {rows.length === 0 ? (
            <div className="p-4 text-sm text-zinc-400">No canary results yet.</div>
          ) : (
            rows.map((r) => {
              const failed = (r.checks || []).filter((c) => !c.ok);
              const top = failed[0];
              const statusLabel = r.ok ? "OK" : "FAIL";

              return (
                <div
                  key={r.featureId}
                  className="grid grid-cols-12 gap-2 border-t border-zinc-800 px-3 py-3 text-sm"
                >
                  <div className="col-span-3 font-semibold">{r.featureId}</div>
                  <div className="col-span-2">
                    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${pillClass(r.ok)}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="col-span-3 text-zinc-400">{fmt(r.createdAt)}</div>
                  <div className="col-span-4 text-zinc-300">
                    {top ? (
                      <div>
                        <div className="font-semibold">{top.label}</div>
                        {(top.error || top.details) ? (
                          <div className="text-xs text-zinc-400">{top.error || top.details}</div>
                        ) : null}
                        {top.fixHint?.summary ? (
                          <div className="mt-1 text-xs text-amber-200/90">
                            Fix hint: {top.fixHint.summary}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="text-xs text-zinc-500">
          Tip: click a recent run to expand failed checks + fix hints. Autopilot issue link is now auto-discovered.
        </div>
      </div>
    </div>
  );
}
