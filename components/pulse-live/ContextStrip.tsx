"use client";

/**
 * Context Strip - Quiet awareness indicators
 * components/pulse-live/ContextStrip.tsx
 */

import { Users, Briefcase, Brain, Globe } from "lucide-react";
import { useState } from "react";

interface ContextStripProps {
  people?: Array<{ name: string; id: string }>;
  deal?: { name: string; id: string };
  hasMemory?: boolean;
  hasIntel?: boolean;
}

export function ContextStrip({ people, deal, hasMemory, hasIntel }: ContextStripProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const hasContext = people && people.length > 0 || deal || hasMemory || hasIntel;

  if (!hasContext) {
    return null;
  }

  return (
    <div className="border-t border-zinc-800 p-2">
      <div className="flex items-center justify-center gap-4">
        {people && people.length > 0 && (
          <div
            className="relative"
            onMouseEnter={() => setHovered("people")}
            onMouseLeave={() => setHovered(null)}
          >
            <Users className="w-4 h-4 text-zinc-500 hover:text-zinc-400 transition-colors cursor-help" />
            {hovered === "people" && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-300 whitespace-nowrap z-10">
                {people.map((p) => p.name).join(", ")}
              </div>
            )}
          </div>
        )}

        {deal && (
          <div
            className="relative"
            onMouseEnter={() => setHovered("deal")}
            onMouseLeave={() => setHovered(null)}
          >
            <Briefcase className="w-4 h-4 text-zinc-500 hover:text-zinc-400 transition-colors cursor-help" />
            {hovered === "deal" && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-300 whitespace-nowrap z-10">
                {deal.name}
              </div>
            )}
          </div>
        )}

        {hasMemory && (
          <div
            className="relative"
            onMouseEnter={() => setHovered("memory")}
            onMouseLeave={() => setHovered(null)}
          >
            <Brain className="w-4 h-4 text-zinc-500 hover:text-zinc-400 transition-colors cursor-help" />
            {hovered === "memory" && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-300 whitespace-nowrap z-10">
                Prior meeting context available
              </div>
            )}
          </div>
        )}

        {hasIntel && (
          <div
            className="relative"
            onMouseEnter={() => setHovered("intel")}
            onMouseLeave={() => setHovered(null)}
          >
            <Globe className="w-4 h-4 text-zinc-500 hover:text-zinc-400 transition-colors cursor-help" />
            {hovered === "intel" && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-300 whitespace-nowrap z-10">
                Web intelligence loaded
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

