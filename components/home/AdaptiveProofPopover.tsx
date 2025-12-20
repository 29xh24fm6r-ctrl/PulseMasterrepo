"use client";

import React, { useState } from "react";
import type { AdaptiveProof } from "@/lib/surfaces/types";
import { PULSE } from "@/lib/ui/pulseTheme";

export function AdaptiveProofPopover({ proof }: { proof?: AdaptiveProof }) {
  const [open, setOpen] = useState(false);
  const shown = proof?.shownBecause || [];

  if (!shown.length) return null;

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`text-[11px] ${PULSE.text.dim} hover:text-white transition underline decoration-zinc-700 hover:decoration-zinc-300`}
        aria-label="Why am I seeing this?"
      >
        Why this is here
      </button>

      {open ? (
        <div
          className={`absolute right-0 top-6 z-50 w-80 ${PULSE.radius.card} ${PULSE.surface.card} p-4`}
        >
          <div className="text-xs font-semibold text-white">Pulse reasoning</div>
          <ul className="mt-2 space-y-2">
            {shown.slice(0, 6).map((t, i) => (
              <li key={i} className="text-xs text-zinc-300">
                • {t}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-end">
            <button
              className="text-xs text-zinc-400 hover:text-white transition"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

