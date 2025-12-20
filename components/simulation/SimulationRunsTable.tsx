// components/simulation/SimulationRunsTable.tsx
"use client";

import React from "react";
import type { SimulationRunRow } from "@/lib/simulation/client/runsApi";

function fmt(ms: number | null) {
  if (ms == null) return "";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(2)} s`;
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}m ${r.toFixed(0)}s`;
}

function badge(status: string) {
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";
  if (status === "finished") return `${base} border-emerald-500/50 bg-emerald-500/10 text-emerald-400`;
  if (status === "failed") return `${base} border-red-500/50 bg-red-500/10 text-red-400`;
  if (status === "started") return `${base} border-amber-500/50 bg-amber-500/10 text-amber-400`;
  return `${base} border-zinc-600 bg-zinc-800 text-zinc-300`;
}

export default function SimulationRunsTable(props: {
  runs: SimulationRunRow[];
  busy?: boolean;
  error?: string | null;
  onRefresh: () => void;
  onSelectRun: (runId: string) => void;
}) {
  const { runs, busy, error, onRefresh, onSelectRun } = props;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-white">Recent Runs</div>
          <div className="text-xs text-zinc-400">
            Audit-backed: request_id, duration, status, errors
          </div>
        </div>
        <button
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
          onClick={onRefresh}
          disabled={!!busy}
        >
          {busy ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? <div className="text-sm text-red-400">{error}</div> : null}

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-zinc-400">
            <tr className="border-b border-zinc-700">
              <th className="py-2 text-left font-medium">Status</th>
              <th className="py-2 text-left font-medium">Started</th>
              <th className="py-2 text-left font-medium">Duration</th>
              <th className="py-2 text-left font-medium">Route</th>
              <th className="py-2 text-left font-medium">Mode</th>
              <th className="py-2 text-left font-medium">Request</th>
              <th className="py-2 text-left font-medium">Error</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td className="py-3 text-zinc-400" colSpan={7}>
                  No runs yet.
                </td>
              </tr>
            ) : (
              runs.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-zinc-700 hover:bg-zinc-800/50 cursor-pointer"
                  onClick={() => onSelectRun(r.id)}
                  title="Click to view details"
                >
                  <td className="py-2">
                    <span className={badge(r.status)}>{r.status}</span>
                  </td>
                  <td className="py-2 whitespace-nowrap text-white">
                    {new Date(r.started_at).toLocaleString()}
                  </td>
                  <td className="py-2 whitespace-nowrap text-white">{fmt(r.duration_ms)}</td>
                  <td className="py-2 whitespace-nowrap text-white">{r.route}</td>
                  <td className="py-2 whitespace-nowrap text-white">{r.mode}</td>
                  <td className="py-2 font-mono text-xs whitespace-nowrap text-zinc-300">
                    {r.request_id}
                  </td>
                  <td className="py-2 max-w-[320px] truncate text-red-400">
                    {r.error || ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

