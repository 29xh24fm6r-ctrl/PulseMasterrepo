"use client";

/**
 * Reality Stream - Delta-focused activity stream
 * components/workspace/RealityStream.tsx
 */

import Link from "next/link";
import type { StreamCard } from "@/lib/surfaces/types";

function severityDot(n: number) {
  if (n >= 85) return "bg-red-500";
  if (n >= 70) return "bg-amber-500";
  return "bg-zinc-600";
}

export function RealityStream(props: {
  items: StreamCard[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-3">
      <div className="px-2 pb-2">
        <div className="text-sm font-semibold text-white">Reality Stream</div>
        <div className="text-xs text-zinc-500">Only deltas. Only threshold-crossers.</div>
      </div>

      <div className="space-y-2">
        {props.items.map((it) => (
          <button
            key={it.id}
            onClick={() => props.onSelect(it.id)}
            className={`w-full text-left rounded-xl border p-4 transition-colors ${
              props.selectedId === it.id ? "border-violet-500/40 bg-violet-500/10" : "border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${severityDot(it.severity)}`} />
                  <div className="text-sm font-medium text-white truncate">{it.title}</div>
                </div>
                {it.delta ? <div className="mt-1 text-xs text-zinc-400">{it.delta}</div> : null}
                {it.why ? <div className="mt-1 text-xs text-zinc-500 line-clamp-2">{it.why}</div> : null}
              </div>

              {it.href ? (
                <Link
                  href={it.href}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 text-xs text-violet-300 hover:text-violet-200"
                >
                  Open
                </Link>
              ) : null}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

