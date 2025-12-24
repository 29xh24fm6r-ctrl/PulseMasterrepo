"use client";

import * as React from "react";

type CanonResult = {
  ok: boolean;
  domain?: string;
  ran_at?: string;
  error?: string;
};

export default function CanonPanel() {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<CanonResult | null>(null);

  async function runEmailCanon() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/canon/email/run", { method: "POST" });
      const json = (await res.json()) as CanonResult;

      if (!res.ok) {
        setResult({ ok: false, domain: "email", error: json?.error || "Unknown error" });
      } else {
        setResult(json);
      }
    } catch (e: any) {
      setResult({ ok: false, domain: "email", error: e?.message || "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/40 backdrop-blur-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-100">Canonical Schema</div>
          <div className="text-xs text-zinc-400">
            Runs auto-fix + assert for the Email domain. Fails fast if drift exists.
          </div>
        </div>

        <button
          onClick={runEmailCanon}
          disabled={loading}
          className="rounded-xl bg-zinc-900/60 border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-900/80 disabled:opacity-50 transition-colors"
        >
          {loading ? "Running…" : "Run Email Canon"}
        </button>
      </div>

      {result && (
        <div className="mt-3 rounded-xl border border-zinc-800/70 bg-zinc-950/60 p-3">
          <div className="text-xs text-zinc-300">
            <span className="font-semibold">Result:</span>{" "}
            {result.ok ? (
              <span className="text-emerald-300">OK</span>
            ) : (
              <span className="text-red-300">FAILED</span>
            )}
          </div>

          <div className="mt-1 text-xs text-zinc-400">
            <span className="font-semibold">Domain:</span> {result.domain || "email"}
          </div>

          {result.ran_at && (
            <div className="mt-1 text-xs text-zinc-400">
              <span className="font-semibold">Ran at:</span> {new Date(result.ran_at).toLocaleString()}
            </div>
          )}

          {result.error && (
            <div className="mt-2 whitespace-pre-wrap text-xs text-red-200 font-mono bg-red-950/20 border border-red-800/50 rounded-lg p-2">
              {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

