"use client";

/**
 * Home Surface - State of My Life
 * app/(pulse)/home/page.tsx
 */

import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import type { HomeSurfacePayload } from "@/lib/surfaces/types";
import { PulseStateBanner } from "@/components/home/PulseStateBanner";
import { LeverageStack } from "@/components/home/LeverageStack";
import { LifeSignalsGrid } from "@/components/home/LifeSignalsGrid";
import { FlashMoment } from "@/components/home/FlashMoment";
import { MythicArcCard } from "@/components/mythic/mythic-arc-card";
import { MythicSessionModal } from "@/components/mythic/mythic-session-modal";

export default function HomeSacred() {
  const { isLoaded, userId } = useAuth();
  const [data, setData] = useState<HomeSurfacePayload | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [openMythic, setOpenMythic] = useState(false);

  useEffect(() => {
    if (!isLoaded || !userId) return;

    fetch("/api/surfaces/home")
      .then((r) => r.json())
      .then((payload) => {
        setData(payload);
        // Show flash if present (only once)
        if (payload.flash && !sessionStorage.getItem("flash_shown_today")) {
          setShowFlash(true);
          sessionStorage.setItem("flash_shown_today", "true");
          setTimeout(() => setShowFlash(false), 5000);
        }
      })
      .catch(() => setData(null));
  }, [isLoaded, userId]);

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {data ? (
          <>
            {/* Flash Moment */}
            {showFlash && data.flash && (
              <FlashMoment
                title={data.flash.title}
                subtitle={data.flash.subtitle}
                show={showFlash}
              />
            )}

            {/* Mythic Arc Card */}
            <MythicArcCard onContinue={() => setOpenMythic(true)} />

            <PulseStateBanner sentence={data.state.sentence} chips={data.state.chips} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7">
                <LeverageStack items={data.leverage} />
              </div>
              <div className="lg:col-span-5">
                <LifeSignalsGrid signals={data.signals} />
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-6 text-zinc-300">
            Loading Home surface…
          </div>
        )}

        <MythicSessionModal
          open={openMythic}
          onOpenChange={setOpenMythic}
          onSaved={() => {
            // Optional: trigger refresh if needed
          }}
        />
      </div>
    </div>
  );
}

