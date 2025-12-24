"use client";

import * as React from "react";

export function GenerateBatchButton() {
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const resp = await fetch("/api/email/suggested-drafts/generate-batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filter: "needs_reply",
          limit: 10,
          tone: "friendly, concise, confident",
          goal: "Reply clearly and ask for next steps/timing if unclear.",
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.ok) {
        setMsg(data?.error || `failed_${resp.status}`);
        return;
      }

      const created = Array.isArray(data.results) ? data.results.filter((r: any) => r?.created).length : 0;
      setMsg(`Batch complete. Created ${created} draft(s).`);
    } catch (e: any) {
      setMsg(e?.message || "run_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <div className="text-sm font-semibold text-white">One-click Drafts</div>
          <div className="text-xs text-zinc-400">Generate AI drafts for Needs Reply.</div>
        </div>
        <button
          onClick={run}
          disabled={busy}
          className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-900/60 disabled:opacity-50"
        >
          {busy ? "Generating…" : "Generate 10 drafts"}
        </button>
      </div>
      {msg ? <div className="mt-2 text-xs text-zinc-300">{msg}</div> : null}
    </div>
  );
}

