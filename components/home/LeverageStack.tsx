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

function EmptyLeverage() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
      <div className="absolute inset-0 opacity-[0.25]">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
      </div>

      <div className="relative">
        <div className="text-sm font-semibold text-white">Clear runway</div>
        <div className="mt-1 text-sm text-zinc-300 leading-relaxed">
          No urgent burdens detected. This is when progress compounds—pick one deliberate move and protect it.
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/workspace"
            className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500"
          >
            Choose one move <ChevronRight className="h-3 w-3" />
          </a>
          <a
            href="/focus"
            className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800"
          >
            Enter Focus Tunnel <ChevronRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

export function LeverageStack(props: { items: LeverageItem[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-[0_18px_60px_rgba(0,0,0,0.55)] p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-white">Leverage Stack</div>
          <div className="text-xs text-zinc-500">The few things that cost you later if ignored.</div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {props.items.length === 0 ? (
          <EmptyLeverage />
        ) : (
          props.items.map((it) => (
            <div key={it.id} className={`rounded-xl border p-4 ${severityClass(it.severity)}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{it.title}</div>
                  {it.why ? <div className="mt-1 text-xs text-zinc-400 line-clamp-2">{it.why}</div> : null}
                </div>

                {it.primaryAction?.href || it.href ? (
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
