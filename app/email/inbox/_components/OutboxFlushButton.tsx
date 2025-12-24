"use client";

import * as React from "react";

type FlushResult = {
  id: string;
  ok: boolean;
  provider_message_id?: string;
  final?: boolean;
  code?: string;
  error?: string;
  retry_in_seconds?: number;
  next_attempt_at?: string;
};

export function OutboxFlushButton() {
  const [loading, setLoading] = React.useState(false);
  const [last, setLast] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function runFlush() {
    setLoading(true);
    setErr(null);
    try {
      const resp = await fetch("/api/email/outbox/flush-ui?limit=10", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setErr(data?.error || `flush_failed_http_${resp.status}`);
        setLast(data);
        return;
      }

      setLast(data);
    } catch (e: any) {
      setErr(e?.message || "flush_failed");
    } finally {
      setLoading(false);
    }
  }

  const processed = Number(last?.processed ?? 0);
  const claimed = Number(last?.claimed ?? 0);
  const results: FlushResult[] = Array.isArray(last?.results) ? last.results : [];

  const sentCount = results.filter((r) => r.ok).length;
  const failedCount = results.filter((r) => !r.ok && r.final).length;
  const retryingCount = results.filter((r) => !r.ok && !r.final).length;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <div className="text-sm font-semibold text-white">Outbox Worker</div>
          <div className="text-xs text-zinc-400">
            Flush queued emails (admin/dev tool)
          </div>
        </div>

        <button
          onClick={runFlush}
          disabled={loading}
          className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-900/60 disabled:opacity-50"
          title="Send queued emails now"
        >
          {loading ? "Flushing…" : "Flush Outbox"}
        </button>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-200">
          <div className="font-semibold">Flush error</div>
          <div className="opacity-90 mt-1">{err}</div>
        </div>
      ) : null}

      {last ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-300">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              <span className="text-zinc-400">Claimed:</span> <span className="font-semibold text-white">{claimed}</span>
            </span>
            <span>
              <span className="text-zinc-400">Processed:</span> <span className="font-semibold text-white">{processed}</span>
            </span>
            <span>
              <span className="text-zinc-400">Sent:</span> <span className="font-semibold text-emerald-400">{sentCount}</span>
            </span>
            <span>
              <span className="text-zinc-400">Retrying:</span> <span className="font-semibold text-amber-400">{retryingCount}</span>
            </span>
            <span>
              <span className="text-zinc-400">Failed:</span> <span className="font-semibold text-red-400">{failedCount}</span>
            </span>
          </div>

          {results.length ? (
            <div className="mt-3 max-h-52 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950/80 p-2">
              <div className="mb-2 text-[11px] font-semibold text-zinc-400">
                Latest results
              </div>
              <div className="flex flex-col gap-1.5">
                {results.slice(0, 30).map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono text-[11px] text-zinc-500">{r.id.slice(0, 8)}…</span>
                    {r.ok ? (
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
                        sent
                      </span>
                    ) : r.final ? (
                      <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-200">
                        failed
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200">
                        retrying
                      </span>
                    )}
                    {r.provider_message_id ? (
                      <span className="text-[11px] text-zinc-400">
                        provider_id: {r.provider_message_id.slice(0, 12)}…
                      </span>
                    ) : null}
                    {!r.ok ? (
                      <span className="text-[11px] text-zinc-400">
                        {r.code ? `${r.code}: ` : ""}{r.error || "send_failed"}
                        {typeof r.retry_in_seconds === "number"
                          ? ` (retry ~${r.retry_in_seconds}s)`
                          : ""}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="text-[11px] text-zinc-500">
        Tip: Real sending also requires <span className="font-mono text-zinc-400">EMAIL_REAL_SEND_ENABLED=true</span>.
      </div>
    </div>
  );
}

