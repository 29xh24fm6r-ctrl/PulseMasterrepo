"use client";

/**
 * Workspace Rail - Mode selector
 * components/workspace/WorkspaceRail.tsx
 */

import type { SurfaceMode } from "@/lib/surfaces/types";

const MODES: Array<{ mode: SurfaceMode; label: string }> = [
  { mode: "now", label: "Now" },
  { mode: "inbox", label: "Inbox" },
  { mode: "pipeline", label: "Pipeline" },
  { mode: "meetings", label: "Meetings" },
  { mode: "people", label: "People" },
  { mode: "brain", label: "Brain" },
];

export function WorkspaceRail(props: { mode: SurfaceMode; onMode: (m: SurfaceMode) => void }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-2">
      {MODES.map((m) => (
        <button
          key={m.mode}
          onClick={() => props.onMode(m.mode)}
          className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
            props.mode === m.mode ? "bg-violet-600/20 text-violet-200" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

