"use client";

import React from "react";
import type { StreamCard } from "@/lib/surfaces/types";
import { PULSE } from "@/lib/ui/pulseTheme";
import { AdaptiveProofPopover } from "@/components/home/AdaptiveProofPopover";
import MicroVisual from "@/components/home/MicroVisual";

function dotClass(sev: number) {
  if (sev >= 80) return "bg-red-400";
  if (sev >= 65) return "bg-amber-400";
  if (sev >= 45) return "bg-violet-400";
  return "bg-zinc-500";
}

export function ActivityFeed({ items }: { items?: StreamCard[] }) {
  const list = items || [];

  return (
    <div className={`${PULSE.radius.card} border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-[0_18px_60px_rgba(0,0,0,0.55)] p-5`}>
      <MicroVisual kind="activity" />
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Pulse Activity</div>
        <a href="/workspace" className={`text-xs ${PULSE.text.dim} hover:text-white transition`}>
          Open →
        </a>
      </div>

      {list.length === 0 ? (
        <div className={`mt-4 text-sm ${PULSE.text.dim}`}>
          No recent activity yet. As you use Pulse, this feed becomes your "alive" layer.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {list.slice(0, 6).map((it) => (
            <a
              key={it.id}
              href={it.href || "#"}
              className={`block ${PULSE.radius.card} ${PULSE.surface.cardSoft} p-3 hover:bg-zinc-900/40 transition`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 h-2.5 w-2.5 rounded-full ${dotClass(it.severity || 0)}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-semibold text-white">{it.title}</div>
                    {it.delta ? (
                      <div className="shrink-0 rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-300">
                        {it.delta}
                      </div>
                    ) : null}
                  </div>

                  {it.why ? <div className="mt-1 line-clamp-2 text-xs text-zinc-400">{it.why}</div> : null}

                  <div className="mt-2">
                    <AdaptiveProofPopover proof={it.proof} />
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
