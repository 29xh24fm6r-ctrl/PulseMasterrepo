"use client";

import React, { useMemo } from "react";
import { useFocusLock } from "@/lib/focus/useFocusLock";

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function FocusLockPage() {
  const { lock, loading, secondsLeft, refresh } = useFocusLock(5000);

  const label = useMemo(() => fmt(secondsLeft), [secondsLeft]);

  async function endNow() {
    await fetch("/api/focus-lock/end", { method: "POST" }).catch(() => {});
    await refresh();
    window.location.href = "/home";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-zinc-400">Loading Focus Lock…</div>
      </div>
    );
  }

  if (!lock) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="max-w-xl w-full p-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
            <div className="text-lg font-semibold">No active Focus Lock</div>
            <div className="mt-2 text-sm text-zinc-400">
              Start one from Home to enter tunnel mode.
            </div>
            <a
              href="/home"
              className="mt-4 inline-flex rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-zinc-400">Focus Lock</div>
              <div className="mt-1 text-3xl font-semibold">{label}</div>
              <div className="mt-2 text-sm text-zinc-300">
                Everything else is hidden until this ends.
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href="/time"
                className="inline-flex rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
              >
                Open Time
              </a>
              <button
                onClick={endNow}
                className="inline-flex rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500"
              >
                End now
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
          <div className="text-sm font-semibold text-white">Pinned Playbook</div>
          <div className="mt-2 text-lg font-semibold text-white">
            {lock.playbook_title || "Your playbook"}
          </div>
          {lock.playbook_do ? (
            <div className="mt-2 text-sm text-zinc-300">{lock.playbook_do}</div>
          ) : (
            <div className="mt-2 text-sm text-zinc-400">
              No "Do" guidance pinned yet — Wisdom will populate this automatically once lessons exist.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-6">
          <div className="text-sm font-semibold text-white">Tunnel Rules</div>
          <ul className="mt-3 space-y-2 text-sm text-zinc-300 list-disc pl-5">
            <li>One thing only. No switching.</li>
            <li>Start with a tiny closure action to build traction.</li>
            <li>If you feel resistance: shrink the step, not the goal.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

