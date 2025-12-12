"use client";

/**
 * Leverage Stack - What needs attention, ranked by leverage
 * components/home/LeverageStack.tsx
 */

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LeverageItem } from "@/lib/surfaces/types";

function severityClass(n: number) {
  if (n >= 85) return "border-red-500/30 bg-red-500/10";
  if (n >= 70) return "border-amber-500/30 bg-amber-500/10";
  return "border-zinc-800 bg-zinc-950/40";
}

export function LeverageStack(props: { items: LeverageItem[] }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-white">Leverage Stack</div>
          <div className="text-xs text-zinc-500">The few things that would cost you later if ignored.</div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {props.items.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-400">
            Clear runway. No high-leverage burdens detected.
          </div>
        ) : (
          props.items.map((it) => (
            <div key={it.id} className={`rounded-xl border p-4 ${severityClass(it.severity)}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{it.title}</div>
                  {it.why ? <div className="mt-1 text-xs text-zinc-400 line-clamp-2">{it.why}</div> : null}
                </div>

                {(it.primaryAction?.href || it.href) ? (
                  <Link
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800"
                    href={it.primaryAction?.href || it.href || "#"}
                  >
                    {it.primaryAction?.label || "Open"} <ChevronRight className="h-3 w-3" />
                  </Link>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

