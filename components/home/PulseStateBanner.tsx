"use client";

/**
 * Pulse State Banner - High-level life state
 * components/home/PulseStateBanner.tsx
 */

import { Sparkles } from "lucide-react";
import type { PulseChip } from "@/lib/surfaces/types";

export function PulseStateBanner(props: { sentence: string; chips?: PulseChip[] }) {
  const chips = Array.isArray(props.chips) ? props.chips : [];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-[0_18px_60px_rgba(0,0,0,0.55)] p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-gradient-to-br from-violet-500/30 to-pink-500/20 p-2">
          <Sparkles className="h-5 w-5 text-violet-300" />
        </div>
        <div className="flex-1">
          <div className="text-sm text-zinc-400">Pulse</div>
          <div className="mt-1 text-lg font-semibold text-white leading-snug">
            {props.sentence}
          </div>

          {chips.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
              {chips.map((c) => (
                <div key={c.label} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">{c.label}</div>
                  <div className="mt-1 text-sm text-zinc-200">{c.value}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}