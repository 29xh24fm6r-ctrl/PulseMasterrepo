"use client";

import * as React from "react";

type Draft = {
  id: string;
  kind: string;
  to_email: string;
  subject: string;
  body: string;
  created_at: string;
  why?: string | null;
  context?: { thread_summary?: string | null; ai?: any } | null;
};

type OutboxRow = {
  id: string;
  status: string;
  send_intent: string | null;
  scheduled_send_at: string | null;
  undo_until: string | null;
  to_email: string | null;
  subject: string | null;
};

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export function AutopilotQueue() {
  const [drafts, setDrafts] = React.useState<Draft[]>([]);
  const [pending, setPending] = React.useState<OutboxRow[]>([]);
  const [sel, setSel] = React.useState<Record<string, boolean>>({});
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [intent, setIntent] = React.useState<"safe" | "real">("safe");
  const [delay, setDelay] = React.useState<number>(0);

  async function load() {
    setMsg(null);
    const [q, p] = await Promise.all([
      fetch("/api/email/autopilot/approval-queue/list", { cache: "no-store" }).then((r) => r.json().catch(() => ({}))),
      fetch("/api/email/autopilot/pending/list", { cache: "no-store" }).then((r) => r.json().catch(() => ({}))),
    ]);

    setDrafts(Array.isArray(q?.drafts) ? q.drafts : []);
    setPending(Array.isArray(p?.rows) ? p.rows : []);
  }

  React.useEffect(() => {
    load();
  }, []);

  function toggleAll(on: boolean) {
    const next: Record<string, boolean> = {};
    for (const d of drafts) next[d.id] = on;
    setSel(next);
  }

  async function approveSelected() {
    const ids = Object.entries(sel)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (!ids.length) {
      setMsg("Select at least one draft.");
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      const resp = await fetch("/api/email/autopilot/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft_ids: ids, intent, delay_seconds: delay }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.ok) {
        setMsg(data?.error || `failed_${resp.status}`);
        return;
      }

      const ok = Array.isArray(data.created) ? data.created.filter((x: any) => x.ok).length : 0;
      setMsg(`Approved ${ok} item(s). Undo window is active.`);
      setSel({});
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function undo(outboxId: string) {
    setBusy(true);
    setMsg(null);
    try {
      const resp = await fetch("/api/email/autopilot/undo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outbox_id: outboxId, reason: "user_undo" }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.ok) {
        setMsg(data?.error || `failed_${resp.status}`);
        return;
      }
      setMsg("Undone.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <div className="text-sm font-semibold text-white">Autopilot v1</div>
          <div className="text-xs text-zinc-400">Approve → schedule → undo window → worker sends.</div>
        </div>
        <button
          onClick={load}
          className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-900/60"
        >
          Refresh
        </button>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold text-zinc-300">Approval settings</div>

          <select
            value={intent}
            onChange={(e) => setIntent(e.target.value as any)}
            className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-2 py-2 text-sm text-white"
          >
            <option value="safe">Safe (queue only)</option>
            <option value="real">Real (requires EMAIL_REAL_SEND_ENABLED=true)</option>
          </select>

          <input
            type="number"
            value={delay}
            onChange={(e) => setDelay(Number(e.target.value || 0))}
            className="w-28 rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-white"
            min={0}
            max={3600}
            placeholder="delay"
            title="Seconds to delay scheduled send"
          />

          <button
            onClick={() => toggleAll(true)}
            className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-900/60"
          >
            Select all
          </button>

          <button
            onClick={() => toggleAll(false)}
            className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-900/60"
          >
            Clear
          </button>

          <button
            onClick={approveSelected}
            disabled={busy}
            className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {busy ? "Working…" : "Approve + Schedule"}
          </button>
        </div>

        {msg ? <div className="text-xs text-zinc-300">{msg}</div> : null}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="text-xs font-semibold text-zinc-300">Approval Queue (active drafts)</div>

          {drafts.length === 0 ? (
            <div className="mt-2 text-xs text-zinc-400">No drafts awaiting approval.</div>
          ) : (
            <div className="mt-2 max-h-96 overflow-auto">
              <div className="flex flex-col gap-2">
                {drafts.map((d) => (
                  <label key={d.id} className="cursor-pointer rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 hover:bg-zinc-900/60">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!sel[d.id]}
                          onChange={(e) => setSel((m) => ({ ...m, [d.id]: e.target.checked }))}
                          className="rounded border-zinc-700"
                        />
                        <div className="text-xs font-semibold text-zinc-300 uppercase">{String(d.kind || "")}</div>
                      </div>
                      <div className="text-[11px] text-zinc-500">{fmt(d.created_at)}</div>
                    </div>

                    <div className="mt-1 text-[11px] text-zinc-400">To: {d.to_email}</div>
                    <div className="mt-1 text-sm font-semibold text-white">{d.subject}</div>

                    {d.why ? (
                      <div className="mt-1 rounded-lg border border-zinc-800 bg-zinc-950/80 p-2 text-[11px] text-zinc-300">
                        <span className="font-semibold">Why:</span> {d.why}
                      </div>
                    ) : null}

                    {d.context?.thread_summary ? (
                      <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/80 p-2 text-[11px] whitespace-pre-wrap text-zinc-300">
                        {d.context.thread_summary}
                      </div>
                    ) : null}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="text-xs font-semibold text-zinc-300">Pending Sends (undo available)</div>

          {pending.length === 0 ? (
            <div className="mt-2 text-xs text-zinc-400">No pending sends.</div>
          ) : (
            <div className="mt-2 max-h-96 overflow-auto">
              <div className="flex flex-col gap-2">
                {pending.map((r) => (
                  <div key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-white">{r.subject || "(no subject)"}</div>
                      <div className="text-[11px] text-zinc-500">{r.send_intent || "—"}</div>
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-400">To: {r.to_email || "—"}</div>
                    <div className="mt-1 text-[11px] text-zinc-400">Scheduled: {fmt(r.scheduled_send_at)}</div>
                    <div className="mt-1 text-[11px] text-zinc-400">Undo until: {fmt(r.undo_until)}</div>

                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => undo(r.id)}
                        disabled={busy}
                        className="rounded-lg border border-red-500/50 bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        Undo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

