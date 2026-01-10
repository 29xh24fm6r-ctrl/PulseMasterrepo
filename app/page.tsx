"use client";

import { useEffect, useState } from "react";
import { LivingAtmosphere } from "@/components/home/LivingAtmosphere";
import { OrbitalStream } from "@/components/home/OrbitalStream";
import { TemporalPulse } from "@/components/home/TemporalPulse";
import { CommandCenter } from "@/components/home/CommandCenter";
import { SpatialDock } from "@/components/home/SpatialDock";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen text-white font-sans selection:bg-violet-500/30 overflow-hidden">

      {/* LAYER 0: Background (Living Atmosphere) */}
      <LivingAtmosphere />

      {/* LAYER 1: Atmosphere (Intention) */}
      <div className="relative z-10 flex flex-col min-h-screen pb-32">

        {/* Top Spacer / Status Area */}
        <div className="pt-8 px-8 flex justify-between items-center opacity-50 text-xs tracking-widest font-mono text-zinc-500">
          <span>PULSE_OS_V4.3</span>
          <div className="flex gap-4">
            <span>NET: STABLE</span>
            <span>CPU: 12%</span>
          </div>
        </div>

        {/* The Mind (Orbital Stream) - Moved to Layout */}
        {/* <div className="px-6 mb-12"><OrbitalStream /></div> */}

        {/* Temporal Core */}
        <div className="flex-1 flex flex-col justify-center items-center mb-12">
          <TemporalPulse />
        </div>

        {/* LAYER 2: Ground (Action) */}
        <CommandCenter />

      </div>

      {/* LAYER 3: Orbit (Navigation) - Managed by Global Layout (QuantumDock) */}
      {/* <SpatialDock /> Removed to prevent double docking */}

    </div>
  );
}

