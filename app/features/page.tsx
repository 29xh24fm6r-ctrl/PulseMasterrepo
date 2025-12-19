"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, Search, ExternalLink, Activity } from "lucide-react";

type Row = {
  id: string;
  name: string;
  group: string;
  status: string;
  ok: boolean;
  links: { label: string; href: string }[];
  apis: { method: string; path: string; ok: boolean; status?: number; error?: string }[];
  observed_apis?: { method: string; path: string }[];
  diagnostics?: {
    missing_apis?: { caller_file: string; api: string }[];
    unowned_calls?: { caller_file: string; api: string }[];
    unused_defined_apis?: { api: string }[];
  };
  locked?: boolean;
  lockedReason?: string;
  canaryStatus?: "green" | "yellow" | "red" | null;
  canaryResult?: {
    ok: boolean;
    checks: Array<{ id: string; label: string; ok: boolean; details?: string; error?: string }>;
    message?: string;
  };
  canaryLastOk?: string | null;
};

export default function FeatureHubPage() {
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(false);
  const [runningCanaries, setRunningCanaries] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string>("all");
  const [accessCtx, setAccessCtx] = useState<any>(null);
  const [expandedCanary, setExpandedCanary] = useState<Record<string, boolean>>({});

  async function load(ping: boolean) {
    try {
      if (ping) setPinging(true);
      const res = await fetch(`/api/features/health${ping ? "?ping=1" : ""}`, { cache: "no-store" });
      const data = await res.json();
      const features = data.features || [];
      
      // Fetch canary results for features that have them
      try {
        const canaryRes = await fetch("/api/ops/features/canary", { cache: "no-store" });
        const canaryData = await canaryRes.json();
        if (canaryData.ok && canaryData.results) {
          const featuresWithCanaries = features.map((f: Row) => {
            const canary = canaryData.results[f.id];
            if (!canary) return f;
            
            const status = canary.result?.ok ? "green" : canary.result?.checks?.some((c: any) => c.ok) ? "yellow" : "red";
            return {
              ...f,
              canaryStatus: status,
              canaryResult: canary.result,
              canaryLastOk: canary.lastOk,
            };
          });
          setRows(featuresWithCanaries);
          return;
        }
      } catch (err) {
        console.warn("Failed to fetch canary results:", err);
      }
      
      setRows(features);
    } finally {
      setLoading(false);
      setPinging(false);
    }
  }

  async function runAllCanaries() {
    try {
      setRunningCanaries(true);
      const res = await fetch("/api/ops/features/canary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok && data.results) {
        // Merge canary results into rows
        setRows((prev) =>
          prev.map((f) => {
            const canary = data.results[f.id];
            if (!canary) return f;
            const status = canary.ok ? "green" : canary.checks?.some((c: any) => c.ok) ? "yellow" : "red";
            return {
              ...f,
              canaryStatus: status,
              canaryResult: canary,
              canaryLastOk: canary.ok ? new Date().toISOString() : f.canaryLastOk,
            };
          })
        );
      }
    } catch (err) {
      console.error("Failed to run canaries:", err);
    } finally {
      setRunningCanaries(false);
    }
  }

  useEffect(() => {
    load(false);
    // Fetch access context for lock evaluation
    fetch("/api/access/me")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.ctx) {
          setAccessCtx(data.ctx);
          // Re-evaluate locks with access context
          evaluateLocks(data.ctx);
        }
      })
      .catch(() => {});
  }, []);

  function evaluateLocks(ctx: any) {
    // Client-side gate evaluation (simplified)
    // Full evaluation would require importing gate logic or calling an API
    setRows((prev) => prev.map((r) => {
      // Basic checks - full eval would need server-side logic
      if (!ctx.isAuthed && r.id !== "home") {
        return { ...r, locked: true, lockedReason: "Sign in required" };
      }
      return r;
    }));
  }

  const groups = useMemo(() => {
    const s = new Set(rows.map((r) => r.group));
    return ["all", ...Array.from(s).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchQ =
        !qq ||
        r.name.toLowerCase().includes(qq) ||
        r.id.toLowerCase().includes(qq) ||
        r.group.toLowerCase().includes(qq);
      const matchG = group === "all" || r.group === group;
      return matchQ && matchG;
    });
  }, [rows, q, group]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const okCount = rows.filter((r) => r.ok).length;

  // Aggregate diagnostics
  const allMissing = rows.flatMap((r) => r.diagnostics?.missing_apis || []);
  const allUnowned = rows.flatMap((r) => r.diagnostics?.unowned_calls || []);
  const allUnused = rows.flatMap((r) => r.diagnostics?.unused_defined_apis || []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Feature Hub</h1>
            <p className="text-zinc-400">
              Everything in Pulse, guaranteed reachable. {okCount}/{rows.length} green.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => load(true)}
              disabled={pinging}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 flex items-center gap-2 text-sm font-medium"
            >
              <Activity className={`w-4 h-4 ${pinging ? "animate-pulse" : ""}`} />
              {pinging ? "Pinging…" : "Run Health Ping"}
            </button>
            <button
              onClick={runAllCanaries}
              disabled={runningCanaries}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 flex items-center gap-2 text-sm font-medium"
            >
              <Activity className={`w-4 h-4 ${runningCanaries ? "animate-spin" : ""}`} />
              {runningCanaries ? "Running…" : "Run All Canaries"}
            </button>
          </div>
        </div>

        {/* Diagnostics Warnings */}
        {(allMissing.length > 0 || allUnowned.length > 0 || allUnused.length > 0) && (
          <div className="bg-amber-900/20 border border-amber-800 rounded-2xl p-4">
            <div className="font-semibold text-amber-300 mb-2">⚠️ API Usage Warnings</div>
            <div className="text-sm text-zinc-400 space-y-1">
              {allMissing.length > 0 && (
                <div>
                  <span className="text-rose-400">{allMissing.length}</span> missing API calls (pages calling non-existent APIs)
                </div>
              )}
              {allUnowned.length > 0 && (
                <div>
                  <span className="text-yellow-400">{allUnowned.length}</span> unowned API calls (components/libs not tied to a route)
                </div>
              )}
              {allUnused.length > 0 && (
                <div>
                  <span className="text-zinc-400">{allUnused.length}</span> unused defined APIs (endpoints never called)
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
            <Search className="w-4 h-4 text-zinc-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search features…"
              className="w-full bg-transparent outline-none text-sm"
            />
          </div>

          <div className="md:col-span-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg p-2 text-sm outline-none"
            >
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g === "all" ? "All groups" : g}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {r.ok ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                        {r.group}
                      </div>
                      <div className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                        {r.status}
                      </div>
                      {r.canaryStatus && (
                        <div
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            r.canaryStatus === "green"
                              ? "bg-emerald-900/50 text-emerald-300 border border-emerald-800"
                              : r.canaryStatus === "yellow"
                              ? "bg-yellow-900/50 text-yellow-300 border border-yellow-800"
                              : "bg-rose-900/50 text-rose-300 border border-rose-800"
                          }`}
                        >
                          {r.canaryStatus === "green" ? "✓" : r.canaryStatus === "yellow" ? "⚠" : "✗"} Canary
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      id: {r.id}
                      {r.canaryLastOk && (
                        <span className="ml-2 text-emerald-400">
                          Last OK: {new Date(r.canaryLastOk).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {r.links.map((l) => (
                    r.locked ? (
                      <button
                        key={l.href}
                        disabled
                        className="px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-500 text-sm flex items-center gap-2 cursor-not-allowed"
                        title={r.lockedReason || "Locked"}
                      >
                        {l.label} 🔒
                      </button>
                    ) : (
                      <Link
                        key={l.href}
                        href={l.href}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm flex items-center gap-2"
                      >
                        {l.label} <ExternalLink className="w-4 h-4" />
                      </Link>
                    )
                  ))}
                </div>
              </div>

              {r.canaryResult && (
                <div className="mt-4">
                  <button
                    onClick={() => setExpandedCanary((prev) => ({ ...prev, [r.id]: !prev[r.id] }))}
                    className="text-xs text-zinc-400 hover:text-zinc-200 underline"
                  >
                    {expandedCanary[r.id] ? "Hide canary details" : "Show canary details"}
                  </button>
                  {expandedCanary[r.id] && (
                    <div className="mt-2 space-y-2 p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg">
                      <div className="text-xs font-semibold text-zinc-300">{r.canaryResult.message || "Canary results"}</div>
                      {r.canaryResult.checks.map((check, idx) => (
                        <div key={idx} className="text-xs flex items-center gap-2">
                          {check.ok ? (
                            <span className="text-emerald-400">✓</span>
                          ) : (
                            <span className="text-rose-400">✗</span>
                          )}
                          <span className={check.ok ? "text-zinc-300" : "text-rose-300"}>{check.label}</span>
                          {check.error && <span className="text-rose-400">— {check.error}</span>}
                          {check.details && <span className="text-zinc-500">— {check.details}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {r.apis && r.apis.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs text-zinc-400 mb-2">Defined API Routes</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {r.apis.map((a, idx) => (
                      <div
                        key={`${a.method}:${a.path}:${idx}`}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-mono">
                            <span className="text-zinc-400">{a.method}</span>{" "}
                            <span>{a.path}</span>
                          </div>
                          <div className="text-xs">
                            {a.ok ? (
                              <span className="text-emerald-400">OK</span>
                            ) : (
                              <span className="text-rose-400">
                                FAIL{a.status ? ` (${a.status})` : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        {a.error && <div className="text-xs text-rose-300 mt-1">{a.error}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {r.observed_apis && r.observed_apis.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs text-zinc-400 mb-2">Observed API Calls</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {r.observed_apis.map((a, idx) => (
                      <div
                        key={`obs-${a.method}:${a.path}:${idx}`}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-3"
                      >
                        <div className="text-sm font-mono">
                          <span className="text-zinc-400">{a.method}</span> <span>{a.path}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {r.diagnostics && (
                <div className="mt-4 space-y-2">
                  {r.diagnostics.missing_apis && r.diagnostics.missing_apis.length > 0 && (
                    <div className="rounded-xl border border-rose-800 bg-rose-950/20 p-3">
                      <div className="text-xs text-rose-400 font-semibold mb-1">
                        Missing APIs ({r.diagnostics.missing_apis.length})
                      </div>
                      <div className="text-xs text-zinc-400 space-y-1">
                        {r.diagnostics.missing_apis.slice(0, 5).map((m, idx) => (
                          <div key={idx}>
                            {m.caller_file} → <span className="font-mono">{m.api}</span>
                          </div>
                        ))}
                        {r.diagnostics.missing_apis.length > 5 && (
                          <div className="text-zinc-500">+{r.diagnostics.missing_apis.length - 5} more</div>
                        )}
                      </div>
                    </div>
                  )}
                  {r.diagnostics.unowned_calls && r.diagnostics.unowned_calls.length > 0 && (
                    <div className="rounded-xl border border-yellow-800 bg-yellow-950/20 p-3">
                      <div className="text-xs text-yellow-400 font-semibold mb-1">
                        Unowned Calls ({r.diagnostics.unowned_calls.length})
                      </div>
                      <div className="text-xs text-zinc-400 space-y-1">
                        {r.diagnostics.unowned_calls.slice(0, 5).map((u, idx) => (
                          <div key={idx}>
                            {u.caller_file} → <span className="font-mono">{u.api}</span>
                          </div>
                        ))}
                        {r.diagnostics.unowned_calls.length > 5 && (
                          <div className="text-zinc-500">+{r.diagnostics.unowned_calls.length - 5} more</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center text-zinc-500 py-12">No features match your search.</div>
          )}
        </div>
      </div>
    </div>
  );
}

