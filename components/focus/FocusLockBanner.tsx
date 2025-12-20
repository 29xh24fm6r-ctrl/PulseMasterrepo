"use client";

import React, { useMemo } from "react";
import { useFocusLock } from "@/lib/focus/useFocusLock";

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FocusLockBanner() {
  const { lock, secondsLeft, refresh } = useFocusLock(5000);

  const label = useMemo(() => fmt(secondsLeft), [secondsLeft]);

  async function endNow() {
    await fetch("/api/focus-lock/end", { method: "POST" }).catch(() => {});
    await refresh();
    window.location.href = "/home";
  }

  if (!lock) return null;

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white">
          Focus Lock • {label}
        </div>
        <div className="mt-1 text-xs text-zinc-200/80">
          {lock.playbook_title ? `Playbook: ${lock.playbook_title}` : "Playbook pinned"}
          {lock.playbook_do ? ` — ${lock.playbook_do}` : ""}
        </div>
      </div>

      <div className="shrink-0 flex gap-2">
        <a
          href="/focus"
          className="rounded-xl bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800"
        >
          Tunnel
        </a>
        <button
          onClick={endNow}
          className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold hover:bg-red-500"
        >
          End
        </button>
      </div>
    </div>
  );
}

