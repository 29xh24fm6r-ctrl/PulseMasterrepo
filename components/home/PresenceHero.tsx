"use client";

/**
 * PresenceHero - makes Home feel alive + personal even with empty data
 * components/home/PresenceHero.tsx
 */

import React, { useEffect, useMemo, useState } from "react";
import { Sparkles, Shield, Zap } from "lucide-react";
import type { HomeSurfacePayload } from "@/lib/surfaces/types";
import PulseCorePresence, { type PulseCoreState } from "@/components/pulse/PulseCorePresence";

type PresenceMode = "FIRST_TIME" | "CLEAR_RUNWAY" | "OVERLOADED" | "NORMAL";

function getPresenceMode(d: HomeSurfacePayload | null, firstTime: boolean): PresenceMode {
  if (firstTime) return "FIRST_TIME";

  const leverageCount = d?.leverage?.length ?? 0;
  const trend = d?.momentum?.trend;

  if (leverageCount >= 4 || trend === "DOWN") return "OVERLOADED";
  if (leverageCount === 0 && (trend === "UP" || trend === "FLAT")) return "CLEAR_RUNWAY";
  return "NORMAL";
}

export function PresenceHero(props: { data: HomeSurfacePayload | null }) {
  const [firstTime, setFirstTime] = useState(false);

  useEffect(() => {
    try {
      const key = "pulse_first_time_seen";
      const seen = localStorage.getItem(key);
      if (!seen) {
        setFirstTime(true);
        localStorage.setItem(key, "1");
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const mode = useMemo(() => getPresenceMode(props.data, firstTime), [props.data, firstTime]);

  const copy = useMemo(() => {
    if (mode === "FIRST_TIME") {
      return {
        icon: Sparkles,
        title: "Welcome. Pulse is now online.",
        body:
          "This is your command surface. You don't need to configure anything—Pulse will adapt as you use it. Start with one move and let the system learn your rhythm.",
        badge: "FIRST SESSION",
      };
    }

    if (mode === "CLEAR_RUNWAY") {
      return {
        icon: Zap,
        title: "Leverage window detected.",
        body:
          "Nothing is on fire. This is the rare state where progress compounds fastest. Choose one meaningful move—Pulse will protect the rest of your attention.",
        badge: "HIGH LEVERAGE",
      };
    }

    if (mode === "OVERLOADED") {
      return {
        icon: Shield,
        title: "I've isolated the noise.",
        body:
          "You're carrying too many open loops. Don't solve everything—solve the highest leverage thing. Pulse will keep the rest from stealing your focus.",
        badge: "PROTECT FOCUS",
      };
    }

    return {
      icon: Sparkles,
      title: "Your system is standing by.",
      body:
        "Pulse is tracking your time, commitments, relationships, and memory so you don't have to hold it all in your head. Make one decisive move and momentum follows.",
      badge: "READY",
    };
  }, [mode]);

  const Icon = copy.icon;

  // Compute Pulse Core state from mode
  const coreState = useMemo<PulseCoreState>(() => {
    if (mode === "OVERLOADED") return "alert";
    if (mode === "FIRST_TIME") return "calm";
    return "calm";
  }, [mode]);

  return (
    <div className="rounded-2xl border border-white/14 bg-white/[0.075] backdrop-blur-md shadow-[0_25px_90px_rgba(0,0,0,0.65)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex items-center gap-2">
            <PulseCorePresence
              state={coreState}
              label="Pulse Presence"
              size={26}
              onActivate={() => {
                // OPTIONAL: wire to command palette later
                // For now, keep bulletproof: no side effects.
              }}
            />
            <span className="text-xs text-zinc-400">Pulse Presence</span>
          </div>
          <div>
            <div className="mt-1 text-xl font-semibold text-white leading-snug">{copy.title}</div>
            <div className="mt-2 text-sm text-zinc-300 leading-relaxed max-w-2xl">{copy.body}</div>
          </div>
        </div>

        <div className="shrink-0">
          <div className="rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-violet-200">
            {copy.badge}
          </div>
        </div>
      </div>

      {/* Micro "system status" line (feels advanced, stays truthful) */}
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-400">
        <span className="rounded-lg border border-zinc-800 bg-zinc-900/25 px-2 py-1">
          Attention: {props.data?.momentum?.trend ?? "—"}
        </span>
        <span className="rounded-lg border border-zinc-800 bg-zinc-900/25 px-2 py-1">
          Leverage items: {props.data?.leverage?.length ?? 0}
        </span>
        <span className="rounded-lg border border-zinc-800 bg-zinc-900/25 px-2 py-1">
          Memory cues: {props.data?.activity?.length ?? 0}
        </span>
      </div>
    </div>
  );
}

