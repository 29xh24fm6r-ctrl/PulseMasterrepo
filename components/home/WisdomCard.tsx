"use client";

import React from "react";
import type { WisdomHighlight } from "@/lib/surfaces/types";
import { PULSE } from "@/lib/ui/pulseTheme";
import { AdaptiveProofPopover } from "@/components/home/AdaptiveProofPopover";
import MicroVisual from "@/components/home/MicroVisual";

export function WisdomCard({ wisdom }: { wisdom?: WisdomHighlight | null }) {
  if (!wisdom) {
    return (
      <div className={`${PULSE.radius.card} border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-[0_18px_60px_rgba(0,0,0,0.55)] p-5`}>
        <MicroVisual kind="wisdom" />
        <div className="text-sm font-semibold text-white">Wisdom of You</div>
        <div className="mt-2 text-sm text-zinc-400">
          Pulse hasn't generated enough experience-based lessons yet. As you log actions and outcomes,
          your personal playbook appears here.
        </div>
        <div className="mt-3 text-xs text-zinc-500">
          Tip: when you finish something meaningful, capture a quick "result + what worked".
        </div>
      </div>
    );
  }

  const score = Math.round(((wisdom.usefulness ?? 0.5) * (wisdom.strength ?? 0.5)) * 100);

  return (
    <div className={`${PULSE.radius.card} border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-[0_18px_60px_rgba(0,0,0,0.55)] p-5`}>
      <MicroVisual kind="wisdom" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Wisdom of You</div>
          <div className="mt-1 text-xs text-zinc-500">
            {wisdom.domain ? `Domain: ${wisdom.domain}` : "Personal playbook"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-400">Fit</div>
          <div className="mt-1 text-2xl font-semibold text-white">{score}</div>
        </div>
      </div>

      <div className="mt-3 text-base font-semibold text-white">{wisdom.title}</div>
      {wisdom.summary ? <div className="mt-2 text-sm text-zinc-300">{wisdom.summary}</div> : null}

      <div className="mt-4 grid grid-cols-1 gap-3">
        {wisdom.doText ? (
          <div className={`${PULSE.radius.card} ${PULSE.surface.cardSoft} p-3`}>
            <div className="text-xs font-semibold text-emerald-200">Do</div>
            <div className="mt-1 text-sm text-zinc-200">{wisdom.doText}</div>
          </div>
        ) : null}

        {wisdom.avoidText ? (
          <div className={`${PULSE.radius.card} ${PULSE.surface.cardSoft} p-3`}>
            <div className="text-xs font-semibold text-amber-200">Avoid</div>
            <div className="mt-1 text-sm text-zinc-200">{wisdom.avoidText}</div>
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        <AdaptiveProofPopover proof={wisdom.proof} />
      </div>
    </div>
  );
}

