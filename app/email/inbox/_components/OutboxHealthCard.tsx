"use client";

import * as React from "react";

type Stats = {
  ok: boolean;
  counts: { queued: number; sending: number; sent: number; failed: number };
  sent_24h: number;
  failed_24h: number;
  next_retry: { id: string; next_attempt_at: string } | null;
  last_failures: Array<{
    id: string;
    last_error: string | null;
    attempt_count: number | null;
    max_attempts: number | null;
    updated_at: string | null;
    provider: string | null;
    provider_message_id: string | null;
    auto_fix_suggested?: boolean | null;
    auto_fix_payload?: any;
  }>;
  now: string;
  error?: string;
};

function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}

function secondsUntil(iso?: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.floor(ms / 1000);
}

export function OutboxHealthCard() {
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<Stats | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const resp = await fetch("/api/email/outbox/stats", { cache: "no-store" });
      const json = (await resp.json().catch(() => ({}))) as Stats;

      if (!resp.ok || !json.ok) {
        setErr(json?.error || `stats_failed_http_${resp.status}`);
        setData(json);
        return;
      }

      setData(json);
    } catch (e: any) {
      setErr(e?.message || "stats_failed");
    } finally {
      setLoading(false);
    }
  }

  async function resendFixed(outboxId: string) {
    setBusyId(outboxId);
    try {
      const resp = await fetch("/api/email/outbox/resend-fixed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outbox_id: outboxId }),
      });
      await resp.json().catch(() => ({}));
      await load();
    } finally {
      setBusyId(null);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  const queued = data?.counts?.queued ?? 0;
  const sending = data?.counts?.sending ?? 0;
  const sent24 = data?.sent_24h ?? 0;
  const failed24 = data?.failed_24h ?? 0;

  const nextRetryIn = secondsUntil(data?.next_retry?.next_attempt_at ?? null);
  const nextRetryLabel =
    nextRetryIn == null
      ? "—"
      : nextRetryIn <= 0
        ? "now"
        : nextRetryIn < 60
          ? `${nextRetryIn}s`
          : nextRetryIn < 3600
            ? `${Math.ceil(nextRetryIn / 60)}m`
            : `${Math.ceil(nextRetryIn / 3600)}h`;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <div className="text-sm font-semibold text-white">Outbox Health</div>
          <div className="text-xs text-zinc-400">Live status + failures</div>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-900/60 disabled:opacity-50"
          title="Refresh outbox health"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-200">
          <div className="font-semibold">Stats error</div>
          <div className="opacity-90 mt-1">{err}</div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="text-zinc-400">Queued</div>
          <div className="text-lg font-semibold text-white">{queued}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="text-zinc-400">Sending</div>
          <div className="text-lg font-semibold text-white">{sending}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="text-zinc-400">Sent (24h)</div>
          <div className="text-lg font-semibold text-emerald-400">{sent24}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="text-zinc-400">Failed (24h)</div>
          <div className="text-lg font-semibold text-red-400">{failed24}</div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-300">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-zinc-400">Next retry:</span>{" "}
            <span className="font-semibold text-white">{nextRetryLabel}</span>
            {data?.next_retry?.next_attempt_at ? (
              <span className="text-zinc-500"> ({fmtTime(data.next_retry.next_attempt_at)})</span>
            ) : null}
          </div>
          <div className="text-zinc-500">as of {fmtTime(data?.now)}</div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-300">
        <div className="mb-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Last failures</div>
        {data?.last_failures?.length ? (
          <div className="max-h-56 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950/80 p-2">
            <div className="flex flex-col gap-2">
              {data.last_failures.map((f) => {
                const suggested = f.auto_fix_payload?.suggested;
                return (
                  <div key={f.id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-zinc-500">{f.id.slice(0, 8)}…</span>
                      <span className="text-zinc-500">{fmtTime(f.updated_at)}</span>
                    </div>

                    <div className="mt-1 text-zinc-300">{f.last_error || "—"}</div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {suggested ? (
                        <>
                          <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
                            auto-fix: {String(suggested)}
                          </span>
                          <button
                            onClick={() => resendFixed(f.id)}
                            disabled={busyId === f.id}
                            className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                          >
                            {busyId === f.id ? "Resending…" : "Resend fixed"}
                          </button>
                        </>
                      ) : (
                        <span className="opacity-60 text-[11px]">no auto-fix suggestion</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-zinc-400">No recent failures 🎉</div>
        )}
      </div>
    </div>
  );
}
