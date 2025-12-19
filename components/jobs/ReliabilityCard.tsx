"use client";

import React, { useEffect, useState } from "react";

type Reliability = {
  started: number;
  completed: number;
  failed: number;
  retry_scheduled: number;
  recovered_stuck: number;
  lost_lease: number;
  success_rate: number;
};

function pct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

export default function ReliabilityCard() {
  const [data, setData] = useState<Reliability | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [scope, setScope] = useState<"system" | "user">("system");

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        setLoading(true);
        setErr(null);
        const r = await fetch(`/api/ops/reliability?scope=${scope}`, { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        if (!r.ok) {
          setData(null);
          setErr(j?.error ?? "Failed to load reliability");
          return;
        }
        setData(j?.reliability ?? null);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load reliability");
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    const id = setInterval(run, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [scope]);

  const success = data?.success_rate ?? 0;

  const statusMessage = data
    ? success < 0.90
      ? "System degraded — retries will be slower to protect correctness."
      : success >= 0.98
      ? "System healthy — normal execution cadence."
      : null
    : null;

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-semibold">Reliability (Last 24h)</div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5">
          <button
            onClick={() => setScope("system")}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              scope === "system"
                ? "bg-slate-100 text-slate-900 font-medium"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            System
          </button>
          <button
            onClick={() => setScope("user")}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              scope === "user"
                ? "bg-slate-100 text-slate-900 font-medium"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Mine
          </button>
        </div>
      </div>
      <div className="text-xs text-slate-500">
        {scope === "system" ? "System-wide execution outcomes" : "Your pipeline health"}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : err ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</div>
        ) : !data ? (
          <div className="text-sm text-slate-500">No data yet.</div>
        ) : (
          <>
            <div className="text-2xl font-semibold">{pct(success)} success</div>
            {statusMessage && (
              <div
                className={`mt-1 text-xs ${
                  success < 0.90 ? "text-yellow-700" : "text-slate-600"
                }`}
              >
                {statusMessage}
              </div>
            )}

            {/* MTTC Metrics */}
            {data?.mttc_count !== null && data?.mttc_count !== undefined && data.mttc_count > 0 && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="text-xs font-medium text-slate-700 mb-1">Mean Time to Completion</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-slate-500">Avg</div>
                    <div className="font-medium text-slate-900">
                      {data.mttc_avg_seconds
                        ? data.mttc_avg_seconds < 60
                          ? `${data.mttc_avg_seconds.toFixed(1)}s`
                          : `${(data.mttc_avg_seconds / 60).toFixed(1)}m`
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">p95</div>
                    <div className="font-medium text-slate-900">
                      {data.mttc_p95_seconds
                        ? data.mttc_p95_seconds < 60
                          ? `${data.mttc_p95_seconds.toFixed(1)}s`
                          : `${(data.mttc_p95_seconds / 60).toFixed(1)}m`
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Count</div>
                    <div className="font-medium text-slate-900">{data.mttc_count}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div className="rounded-xl border p-2">
                Started: <span className="font-medium text-slate-900">{data.started}</span>
              </div>
              <div className="rounded-xl border p-2">
                Completed: <span className="font-medium text-slate-900">{data.completed}</span>
              </div>
              <div className="rounded-xl border p-2">
                Failed: <span className="font-medium text-slate-900">{data.failed}</span>
              </div>
              <div className="rounded-xl border p-2">
                Retries: <span className="font-medium text-slate-900">{data.retry_scheduled}</span>
              </div>
              <div className="rounded-xl border p-2">
                Recovered: <span className="font-medium text-slate-900">{data.recovered_stuck}</span>
              </div>
              <div className="rounded-xl border p-2">
                Lost lease: <span className="font-medium text-slate-900">{data.lost_lease}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

