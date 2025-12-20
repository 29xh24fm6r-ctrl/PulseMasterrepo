// src/lib/ui/pulseTheme.ts

export const PULSE = {
  radius: {
    card: "rounded-3xl",
    pill: "rounded-full",
    button: "rounded-2xl",
  },
  surface: {
    card: "border border-zinc-800 bg-zinc-900/30 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]",
    cardSoft: "border border-zinc-800/60 bg-zinc-950/30",
    hero:
      "border border-zinc-800 bg-gradient-to-br from-zinc-900/70 via-zinc-900/35 to-zinc-900/10 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]",
  },
  text: {
    dim: "text-zinc-400",
    body: "text-zinc-300",
    strong: "text-white",
  },
  motion: {
    enter: "fade-in-quick",
    enterUp: "fade-in-quick",
  },
} as const;

