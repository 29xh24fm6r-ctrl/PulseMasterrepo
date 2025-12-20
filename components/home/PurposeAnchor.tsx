"use client";

import { Sparkles } from "lucide-react";

export function PurposeAnchor() {
  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-violet-500/20 p-1.5">
          <Sparkles className="h-4 w-4 text-violet-300" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">
            This is a leverage window.
          </div>
          <div className="mt-1 text-sm text-zinc-300 leading-snug">
            Nothing is on fire. Most people waste moments like this — Pulse exists to help you compound them.
          </div>
        </div>
      </div>
    </div>
  );
}

