"use client";

import * as React from "react";

type EventRow = {
  id: string;
  received_at: string;
  from_email: string;
  subject: string;
  snippet: string;
  triage_label: string;
  triage_confidence: number | null;
};

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function badge(label: string) {
  const base = "rounded-full border px-2 py-0.5 text-[11px] font-semibold";
  if (label === "needs_reply") return `${base} border-blue-500/50 bg-blue-500/10 text-blue-200`;
  if (label === "request") return `${base} border-emerald-500/50 bg-emerald-500/10 text-emerald-200`;
  if (label === "waiting_on_them") return `${base} border-yellow-500/50 bg-yellow-500/10 text-yellow-200`;
  return `${base} border-zinc-800 text-zinc-400 opacity-70`;
}

export function TriageFeed() {
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<EventRow[]>([]);
  const [filter, setFilter] = React.useState<string>("needs_reply");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const resp = await fetch(`/api/email/events/list?filter=${encodeURIComponent(filter)}`, { cache: "no-store" });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.ok) {
        setErr(data?.error || `failed_${resp.status}`);
        setRows([]);
        return;
      }
      setRows(Array.isArray(data.events) ? data.events : []);
    } catch (e: any) {
      setErr(e?.message || "load_failed");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <div className="text-sm font-semibold text-white">Triage Feed</div>
          <div className="text-xs text-zinc-400">Latest inbound emails classified by Pulse.</div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-900/60"
          >
            <option value="needs_reply">Needs reply</option>
            <option value="request">Requests</option>
            <option value="task">Tasks</option>
            <option value="waiting_on_them">Waiting on them</option>
            <option value="fyi">FYI</option>
            <option value="all">All</option>
          </select>

          <button
            onClick={load}
            disabled={loading}
            className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-900/60 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-200">
          <div className="font-semibold">Error</div>
          <div className="opacity-90 mt-1">{err}</div>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400">No items for this filter.</div>
      ) : (
        <div className="max-h-[520px] overflow-auto rounded-xl border border-zinc-800 bg-zinc-950/60 p-2">
          <div className="flex flex-col gap-2">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={badge(r.triage_label)}>{r.triage_label}</span>
                    <span className="text-[11px] text-zinc-500">{fmt(r.received_at)}</span>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    conf {typeof r.triage_confidence === "number" ? r.triage_confidence.toFixed(2) : "—"}
                  </span>
                </div>

                <div className="mt-1 text-xs text-zinc-400">From: {r.from_email}</div>
                <div className="mt-1 text-sm font-semibold text-white">{r.subject}</div>
                <div className="mt-1 text-xs text-zinc-300">{r.snippet}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

