"use client";

/**
 * SystemField - immersive background layer (no external images)
 * components/home/SystemField.tsx
 */

import React from "react";

export function SystemField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Deep gradient base */}
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(139,92,246,0.22),transparent_55%),radial-gradient(900px_circle_at_80%_30%,rgba(236,72,153,0.12),transparent_55%),radial-gradient(1000px_circle_at_50%_90%,rgba(34,211,238,0.10),transparent_60%)]" />

      {/* Subtle "neural dust" texture */}
      <div className="absolute inset-0 opacity-[0.16] mix-blend-screen">
        <svg className="w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="none">
          <defs>
            <radialGradient id="g" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="white" stopOpacity="0.55" />
              <stop offset="55%" stopColor="white" stopOpacity="0.07" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Randomized-looking constellation dots */}
          {[
            [120, 140, 3],
            [180, 220, 2],
            [260, 180, 2],
            [340, 260, 3],
            [420, 210, 2],
            [520, 160, 3],
            [640, 240, 2],
            [760, 190, 3],
            [860, 260, 2],
            [980, 170, 3],
            [1080, 240, 2],
            [240, 420, 3],
            [360, 520, 2],
            [520, 460, 3],
            [680, 540, 2],
            [820, 480, 3],
            [980, 560, 2],
            [160, 640, 2],
            [360, 680, 3],
            [600, 700, 2],
            [880, 690, 3],
            [1120, 640, 2],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="url(#g)" />
          ))}

          {/* A few faint connecting lines */}
          <g opacity="0.28" stroke="white" strokeWidth="1">
            <path d="M120 140 L180 220 L260 180 L340 260 L420 210" />
            <path d="M520 160 L640 240 L760 190 L860 260 L980 170" />
            <path d="M240 420 L360 520 L520 460 L680 540 L820 480 L980 560" />
          </g>
        </svg>
      </div>

      {/* Gentle vignette to keep content readable */}
      <div className="absolute inset-0 bg-[radial-gradient(800px_circle_at_50%_10%,transparent_0%,rgba(0,0,0,0.55)_70%,rgba(0,0,0,0.78)_100%)]" />
    </div>
  );
}

