"use client";

import React from "react";
import type { MomentumPayload } from "@/lib/surfaces/types";
import { PULSE } from "@/lib/ui/pulseTheme";
import { AdaptiveProofPopover } from "@/components/home/AdaptiveProofPopover";

function trendStyle(t: MomentumPayload["trend"]) {
  if (t === "UP") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (t === "DOWN") return "border-red-500/30 bg-red-500/10 text-red-200";
  return "border-zinc-700 bg-zinc-900/40 text-zinc-200";
}

export function MomentumCard({ momentum }: { momentum?: MomentumPayload | null }) {
  if (!momentum) return null;

  return (
    <div className={`${PULSE.radius.card} border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-[0_18px_60px_rgba(0,0,0,0.55)] p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Momentum</div>
          <div className={`mt-1 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${trendStyle(momentum.trend)}`}>
            <span className="font-semibold">{momentum.headline}</span>
          </div>
        </div>

        <div className="text-right">
          <div className={`text-xs ${PULSE.text.dim}`}>Score</div>
          <div className="mt-1 text-3xl font-semibold text-white">{momentum.score}</div>
        </div>
      </div>

      <div className="mt-3 text-sm text-zinc-300">{momentum.insight}</div>

      <div className="mt-3 flex items-center justify-between">
        <AdaptiveProofPopover proof={momentum.proof} />
        {momentum.cta?.href ? (
          <a
            href={momentum.cta.href}
            className={`${PULSE.radius.button} inline-flex items-center justify-center bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition`}
          >
            {momentum.cta.label}
          </a>
        ) : null}
      </div>
    </div>
  );
}

