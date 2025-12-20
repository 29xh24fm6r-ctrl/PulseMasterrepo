"use client";

import React from "react";
import type { NextBestAction, PulseChip } from "@/lib/surfaces/types";
import { PULSE } from "@/lib/ui/pulseTheme";
import { AdaptiveProofPopover } from "@/components/home/AdaptiveProofPopover";
import PulseCorePresence from "@/components/pulse/PulseCorePresence";

function badgeColor(label: PulseChip["label"]) {
  switch (label) {
    case "Focus":
      return "bg-violet-500/15 text-violet-200 border-violet-500/30";
    case "Risk":
      return "bg-amber-500/15 text-amber-200 border-amber-500/30";
    case "Opportunity":
      return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
    default:
      return "bg-zinc-500/15 text-zinc-200 border-zinc-500/30";
  }
}

export function CommandSurfaceHero({ next, chips }: { next?: NextBestAction | null; chips?: PulseChip[] }) {
  const href = next?.href || "/workspace";

  return (
    <div className={`${PULSE.radius.card} border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-[0_18px_60px_rgba(0,0,0,0.55)] p-6`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <PulseCorePresence
                state="calm"
                label="Pulse Presence"
                size={28}
                onActivate={() => {
                  // TODO: wire to command palette (client-safe)
                }}
              />
              <div className={`text-xs uppercase tracking-wider ${PULSE.text.dim}`}>Command Surface</div>
            </div>
            <div className="mt-2 text-2xl font-semibold text-white truncate">
              {next?.label ? next.label : "Choose one high-leverage move"}
            </div>
            <div className={`mt-2 text-sm ${PULSE.text.body}`}>{next?.why ? next.why : "Pulse is calibrating."}</div>

            <div className="mt-3">
              <AdaptiveProofPopover proof={next?.proof} />
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className={`text-xs ${PULSE.text.dim}`}>Confidence</div>
            <div className="mt-1 text-2xl font-semibold text-white">{Math.round(next?.confidence ?? 45)}%</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(chips || []).slice(0, 3).map((c, idx) => (
            <div
              key={`${c.label}_${idx}`}
              className={`rounded-full border px-3 py-1 text-xs ${badgeColor(c.label)}`}
              title={c.label}
            >
              <span className="font-semibold">{c.label}:</span> <span className="text-zinc-100/90">{c.value}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <a
            href={href}
            className={`${PULSE.radius.button} inline-flex items-center justify-center bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition`}
          >
            Start
          </a>

          <a href="/workspace" className="text-sm text-zinc-300 hover:text-white transition">
            View full workspace →
          </a>
        </div>
      </div>
    </div>
  );
}
