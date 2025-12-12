"use client";

/**
 * Life Signals Grid - Domain-wise signals
 * components/home/LifeSignalsGrid.tsx
 */

import Link from "next/link";
import type { LifeSignal } from "@/lib/surfaces/types";

export function LifeSignalsGrid(props: { signals: LifeSignal[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {props.signals.map((s) => (
        <div key={s.domain} className="rounded-2xl border border-zinc-800 bg-zinc-900/25 p-4">
          <div className="text-xs text-zinc-500">{s.domain}</div>
          <div className="mt-1 text-lg font-semibold text-white">{s.metric}</div>
          <div className="mt-1 text-sm text-zinc-400 line-clamp-2">{s.insight}</div>

          {s.cta?.href ? (
            <Link href={s.cta.href} className="mt-3 inline-flex text-xs text-violet-300 hover:text-violet-200">
              {s.cta.label}
            </Link>
          ) : null}
        </div>
      ))}
    </div>
  );
}

