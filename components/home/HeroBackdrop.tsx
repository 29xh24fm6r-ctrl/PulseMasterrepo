import React from "react";

/**
 * HeroBackdrop
 * - Server-safe (no hooks)
 * - No external assets
 * - Inline SVG "cinematic" background + subtle grid + aura
 */
export default function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
      {/* Soft aurora */}
      <div className="absolute -inset-[40%] opacity-70 blur-3xl">
        <div
          className="absolute left-1/4 top-0 h-[520px] w-[520px] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(168,85,247,0.55), rgba(0,0,0,0) 65%)",
          }}
        />
        <div
          className="absolute right-0 top-1/3 h-[620px] w-[620px] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(59,130,246,0.42), rgba(0,0,0,0) 62%)",
          }}
        />
        <div
          className="absolute left-1/3 bottom-0 h-[560px] w-[560px] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(236,72,153,0.28), rgba(0,0,0,0) 64%)",
          }}
        />
      </div>

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(70% 55% at 35% 25%, black 55%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(70% 55% at 35% 25%, black 55%, transparent 100%)",
        }}
      />

      {/* "Living diagram" SVG (eye candy that implies intelligence) */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.22]"
        viewBox="0 0 1200 520"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pulse_line" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="rgba(168,85,247,0.95)" />
            <stop offset="0.45" stopColor="rgba(59,130,246,0.85)" />
            <stop offset="1" stopColor="rgba(236,72,153,0.65)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Curves */}
        <path
          d="M 40 410 C 260 300, 420 470, 620 310 C 780 190, 910 320, 1160 210"
          stroke="url(#pulse_line)"
          strokeWidth="2.2"
          fill="none"
          filter="url(#glow)"
        />
        <path
          d="M 20 260 C 240 120, 520 220, 680 140 C 880 40, 1000 160, 1200 70"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.2"
          fill="none"
        />

        {/* Nodes */}
        {[
          [160, 360],
          [320, 310],
          [520, 390],
          [640, 300],
          [780, 250],
          [940, 300],
          [1080, 220],
        ].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="7" fill="rgba(168,85,247,0.55)" />
            <circle
              cx={x}
              cy={y}
              r="16"
              fill="none"
              stroke="rgba(168,85,247,0.22)"
            />
          </g>
        ))}
      </svg>

      {/* vignette for depth */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 60% at 25% 20%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.58) 70%, rgba(0,0,0,0.78) 100%)",
        }}
      />
    </div>
  );
}

