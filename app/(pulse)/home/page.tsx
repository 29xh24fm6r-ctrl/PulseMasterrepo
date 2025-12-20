"use client";

/**
 * Home Surface - State of My Life
 * app/(pulse)/home/page.tsx
 */

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import type { HomeSurfacePayload } from "@/lib/surfaces/types";
import { PulseStateBanner } from "@/components/home/PulseStateBanner";
import { LeverageStack } from "@/components/home/LeverageStack";
import { LifeSignalsGrid } from "@/components/home/LifeSignalsGrid";
import { FlashMoment } from "@/components/home/FlashMoment";
import { MythicArcCard } from "@/components/mythic/mythic-arc-card";
import { MythicSessionModal } from "@/components/mythic/mythic-session-modal";
import { CommandSurfaceHero } from "@/components/home/CommandSurfaceHero";
import { ActivityFeed } from "@/components/home/ActivityFeed";
import { MomentumCard } from "@/components/home/MomentumCard";
import { WisdomCard } from "@/components/home/WisdomCard";
import { getTimeGreeting, getPulseThinkingLine } from "@/lib/ui/pulseCopy";
import { PULSE } from "@/lib/ui/pulseTheme";
import { useFocusLock } from "@/lib/focus/useFocusLock";
import { SystemField } from "@/components/home/SystemField";
import { PresenceHero } from "@/components/home/PresenceHero";
import HeroBackdrop from "@/components/home/HeroBackdrop";
import PulseCard from "@/components/ui/PulseCard";
import MicroVisual from "@/components/home/MicroVisual";
import RelationshipFieldCard from "@/components/home/RelationshipFieldCard";

function recommendedMinutes(trend?: "UP" | "FLAT" | "DOWN") {
  if (trend === "DOWN") return 25;
  if (trend === "UP") return 60;
  return 45;
}

export default function HomeSacred() {
  const { isLoaded, userId } = useAuth();
  const [data, setData] = useState<HomeSurfacePayload | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [openMythic, setOpenMythic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingLine, setLoadingLine] = useState<string>("");

  const { lock, refresh: refreshLock } = useFocusLock(15000);
  const greeting = useMemo(() => getTimeGreeting(new Date()), []);
  const recMins = useMemo(() => recommendedMinutes(data?.momentum?.trend), [data?.momentum?.trend]);

  async function startFocusLock(minutes: number) {
    const playbook_title = data?.wisdom?.title || null;
    const playbook_do = data?.wisdom?.doText || null;

    await fetch("/api/focus-lock/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ minutes, playbook_title, playbook_do }),
    }).catch(() => {});

    window.location.href = "/focus";
  }

  async function endFocusLockNow() {
    await fetch("/api/focus-lock/end", { method: "POST" }).catch(() => {});
    await refreshLock();
    window.location.href = "/home";
  }

  useEffect(() => {
    if (!isLoaded || !userId) return;

    setError(null);
    setLoadingLine(getPulseThinkingLine());

    const t = setInterval(() => setLoadingLine(getPulseThinkingLine()), 900);

    fetch("/api/surfaces/home")
      .then((r) => r.json())
      .then((payload) => {
        clearInterval(t);
        if (payload && payload.state && typeof payload.state.sentence === "string") {
          setData(payload);

          // Fire-and-forget Wisdom refresh (never blocks UI)
          fetch("/api/wisdom/auto-refresh", { method: "POST" }).catch(() => {});

          if (payload.flash && !sessionStorage.getItem("flash_shown_today")) {
            setShowFlash(true);
            sessionStorage.setItem("flash_shown_today", "true");
            setTimeout(() => setShowFlash(false), 5000);
          }
        } else {
          setData(null);
          setError("Pulse returned an unexpected response. Try refresh.");
        }
      })
      .catch(() => {
        clearInterval(t);
        setData(null);
        setError("Couldn't load your Home surface. Check auth / API and retry.");
      });

    return () => clearInterval(t);
  }, [isLoaded, userId]);

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto w-full max-w-[1180px] px-6 pb-20 pt-6">
        {/* Cinematic Hero Region */}
        <div className="relative mb-6 rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
          <HeroBackdrop />

          <div className="relative">
            <div className="mb-2 text-sm text-white/70 fade-in-quick">{greeting}</div>
            {!data && !error ? <div className="mb-2 text-sm text-zinc-300/70">{loadingLine}</div> : null}

            <div className="flex items-end justify-between gap-4 mb-4">
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Your command surface
              </h1>

              {/* Small "alive" indicator zone */}
              <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/70">
                Pulse online • watching your field
              </div>
            </div>

            {/* HERO CARD */}
            <div className="mt-4">
              <PresenceHero data={data} />
            </div>

            {/* Flash Moment */}
            {showFlash && data?.flash ? (
              <div className="mt-4">
                <FlashMoment title={data.flash.title} subtitle={data.flash.subtitle} show={showFlash} />
              </div>
            ) : null}

            {/* First grid row */}
            <div className="mt-5 grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-7 space-y-4">
                <CommandSurfaceHero next={data?.next || null} chips={data?.state?.chips || []} />

                <MomentumCard momentum={data?.momentum || null} />

                {data?.state ? (
                  <PulseStateBanner sentence={data.state.sentence} chips={[]} />
                ) : (
                  <PulseCard className="p-6">
                    {error || "Loading Home surface…"}
                  </PulseCard>
                )}
              </div>

              <div className="col-span-12 md:col-span-5 space-y-4">
                <RelationshipFieldCard />

                <ActivityFeed items={data?.activity || []} />

                <WisdomCard wisdom={data?.wisdom || null} />

                <MythicArcCard onContinue={() => setOpenMythic(true)} />
              </div>
            </div>
          </div>
        </div>

        {/* Lower section */}
        <div className="space-y-6">
          {data ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7">
                <LeverageStack items={data.leverage} />
              </div>
              <div className="lg:col-span-5">
                <LifeSignalsGrid signals={data.signals} />
              </div>
            </div>
          ) : (
            <PulseCard className="p-6">
              {error || "Loading Home surface…"}
              <div className="mt-4">
                <button
                  className={`${PULSE.radius.button} bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700 transition`}
                  onClick={() => location.reload()}
                >
                  Retry
                </button>
              </div>
            </PulseCard>
          )}

          <MythicSessionModal open={openMythic} onOpenChange={setOpenMythic} onSaved={() => {}} />
        </div>
      </div>
    </div>
  );
}
