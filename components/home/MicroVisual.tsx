import React from "react";

export default function MicroVisual({ kind }: { kind: "activity" | "wisdom" | "chapter" }) {
  const title =
    kind === "activity" ? "Activity field" : kind === "wisdom" ? "Wisdom pattern" : "Chapter map";

  return (
    <div className="mb-3 flex items-center gap-3">
      <div className="h-8 w-8 rounded-xl border border-white/10 bg-white/[0.06] grid place-items-center">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M5 12c3-6 11-6 14 0"
            fill="none"
            stroke="rgba(168,85,247,0.9)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M7 14c2.2-3.8 7.8-3.8 10 0"
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="12" cy="15.5" r="1.6" fill="rgba(59,130,246,0.8)" />
        </svg>
      </div>
      <div className="text-xs text-white/60">{title}</div>
    </div>
  );
}

