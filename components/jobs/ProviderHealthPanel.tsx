"use client";

import React, { useEffect, useState } from "react";

type ProviderRow = {
  provider: string;
  status: string;
  failure_rate: number;
  total: number;
  failed: number;
  completed: number;
  window_minutes: number;
  updated_at: string;
};

function pill(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "healthy") return "bg-emerald-900/50 text-emerald-300 border-emerald-800";
  if (s === "degraded") return "bg-yellow-900/50 text-yellow-300 border-yellow-800";
  if (s === "outage") return "bg-red-900/50 text-red-300 border-red-800";
  return "bg-zinc-800 text-zinc-300 border-zinc-700";
}

export default function ProviderHealthPanel() {
  const [rows, setRows] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        setLoading(true);
        const r = await fetch(`/api/providers/health`, { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        const providers = j?.providers ?? [];
        
        // Calculate share of failures if not provided
        const totalFailures = providers.reduce((sum: number, p: ProviderRow) => sum + (p.failed || 0), 0);
        const enriched = providers.map((p: ProviderRow) => ({
          ...p,
          share_of_failures: totalFailures > 0 ? (p.failed || 0) / totalFailures : 0,
        }));
        
        // Sort by share of failures (descending) then by failure rate
        enriched.sort((a: ProviderRow, b: ProviderRow) => {
          const shareA = a.share_of_failures || 0;
          const shareB = b.share_of_failures || 0;
          if (Math.abs(shareA - shareB) > 0.01) return shareB - shareA;
          return (b.failure_rate || 0) - (a.failure_rate || 0);
        });
        
        setRows(enriched);
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
  }, []);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm">
      <div className="text-sm font-semibold">Provider Health</div>
      <div className="text-xs text-zinc-500">
        Rolling health from completed/failed events.
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="text-sm text-zinc-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-zinc-500">No provider data yet.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.provider} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{r.provider}</div>
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${pill(r.status)}`}>
                    {r.status}
                  </span>
                </div>
                <div className="mt-2 text-xs text-zinc-400">
                  Failure rate:{" "}
                  <span className="font-medium text-zinc-300">
                    {(r.failure_rate * 100).toFixed(1)}%
                  </span>{" "}
                  {r.share_of_failures !== null && r.share_of_failures !== undefined && (
                    <>
                      · share of failures:{" "}
                      <span className="font-medium text-zinc-300">
                        {(r.share_of_failures * 100).toFixed(1)}%
                      </span>{" "}
                    </>
                  )}
                  · total: <span className="font-medium text-zinc-300">{r.total}</span> · failed:{" "}
                  <span className="font-medium text-zinc-300">{r.failed}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

