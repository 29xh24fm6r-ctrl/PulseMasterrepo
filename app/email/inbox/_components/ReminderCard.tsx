"use client";

import * as React from "react";

type Reminder = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warn" | "urgent";
  source_type: string;
  source_id: string;
  kind: string;
  next_run_at: string;
  created_at: string;
  snooze_count?: number | null;
};

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function ReminderCard() {
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<Reminder[]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const resp = await fetch("/api/reminders/list", { cache: "no-store" });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.ok) {
        setErr(data?.error || `failed_${resp.status}`);
        setItems([]);
        return;
      }
      setItems(Array.isArray(data.reminders) ? data.reminders : []);
    } catch (e: any) {
      setErr(e?.message || "load_failed");
    } finally {
      setLoading(false);
    }
  }

  async function ack(id: string) {
    setBusy(id);
    try {
      await fetch("/api/reminders/ack", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function snooze(id: string, minutes: number) {
    setBusy(id);
    try {
      await fetch("/api/reminders/snooze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, minutes }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <div className="text-sm font-semibold text-white">Reminders</div>
          <div className="text-xs text-zinc-400">Triage + SLA + outbox failures (never drop anything)</div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-900/60 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-200">
          <div className="font-semibold">Error</div>
          <div className="opacity-90 mt-1">{err}</div>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400">No active reminders 🎉</div>
      ) : (
        <div className="max-h-72 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950/60 p-2">
          <div className="flex flex-col gap-2">
            {items.map((r) => (
              <div key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-white">
                    {r.severity === "urgent" ? "🚨 " : r.severity === "warn" ? "⚠️ " : "ℹ️ "}
                    {r.title}
                  </div>
                  <button
                    onClick={() => ack(r.id)}
                    disabled={busy === r.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-900/60 disabled:opacity-50"
                  >
                    {busy === r.id ? "Working…" : "Mark done"}
                  </button>
                </div>

                <div className="mt-1 text-xs text-zinc-300 whitespace-pre-wrap">{r.body}</div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-zinc-500">Due: {fmt(r.next_run_at)}</span>
                  <span className="text-[11px] text-zinc-500">• Created: {fmt(r.created_at)}</span>
                  {typeof r.snooze_count === "number" ? (
                    <span className="text-[11px] text-zinc-500">• Snoozes: {r.snooze_count}</span>
                  ) : null}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => snooze(r.id, 60)}
                    disabled={busy === r.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-900/60 disabled:opacity-50"
                  >
                    Snooze 1h
                  </button>
                  <button
                    onClick={() => snooze(r.id, 240)}
                    disabled={busy === r.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-900/60 disabled:opacity-50"
                  >
                    Snooze 4h
                  </button>
                  <button
                    onClick={() => snooze(r.id, 24 * 60)}
                    disabled={busy === r.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-900/60 disabled:opacity-50"
                  >
                    Tomorrow
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

