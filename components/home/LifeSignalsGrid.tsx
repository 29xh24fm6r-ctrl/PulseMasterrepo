"use client";

/**
 * Life Signals Grid - Domain-wise signals
 * components/home/LifeSignalsGrid.tsx
 */

import Link from "next/link";
import type { LifeSignal } from "@/lib/surfaces/types";
import { PULSE } from "@/lib/ui/pulseTheme";
import { AdaptiveProofPopover } from "@/components/home/AdaptiveProofPopover";

export function LifeSignalsGrid(props: { signals: LifeSignal[] }) {
  const signals = props.signals || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {signals.map((s) => (
        <div key={s.domain} className={`${PULSE.radius.card} border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-[0_18px_60px_rgba(0,0,0,0.55)] p-4`}>
          <div className="flex items-start justify-between gap-2">
            <div className="text-xs text-zinc-500">{s.domain}</div>
            <div className="shrink-0">
              <AdaptiveProofPopover proof={s.proof} />
            </div>
          </div>

          <div className="mt-1 text-lg font-semibold text-white">{s.metric}</div>
          <div className="mt-1 text-sm text-zinc-400 line-clamp-2">{s.insight}</div>

          {s.cta?.href ? (
            <Link
              href={s.cta.href}
              className="mt-3 inline-flex text-xs text-violet-300 hover:text-violet-200 transition"
            >
              {s.cta.label}
            </Link>
          ) : null}
        </div>
      ))}
    </div>
  );
}
