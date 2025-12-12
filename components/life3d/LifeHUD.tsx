// Life HUD - Floating panels over 3D scene
// components/life3d/LifeHUD.tsx

"use client";

import React, { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { GlassPanel } from "./GlassPanel";
import { FocusPills } from "@/app/components/life-dashboard/FocusPills";
import { EnergyMoodPanel } from "@/app/components/life-dashboard/EnergyMoodPanel";
import { ArcsXpPanel } from "@/app/components/life-dashboard/ArcsXpPanel";

export function LifeHUD() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      // Normalize to -1 to 1
      const normalizedX = (clientX / innerWidth) * 2 - 1;
      const normalizedY = (clientY / innerHeight) * 2 - 1;
      
      // Parallax: move opposite to cursor (4-6px range)
      x.set(normalizedX * -6);
      y.set(normalizedY * -6);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [x, y]);

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 flex flex-col justify-end pb-10 z-10"
      style={{
        x: springX,
        y: springY,
      }}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6">
        {/* Top row: Focus (large) + Emotion (medium) */}
        <div className="grid grid-cols-3 gap-4">
          {/* Today's Focus - Left 2/3 */}
          <div className="pointer-events-auto col-span-2">
            <GlassPanel glowColor="#a855f7" className="min-h-[160px]">
              <h3 className="text-lg font-semibold text-white mb-4 uppercase tracking-wide text-sm">
                Today's Focus
              </h3>
              <div className="text-white">
                <FocusPills />
              </div>
            </GlassPanel>
          </div>

          {/* Emotion Panel - Right 1/3 */}
          <div className="pointer-events-auto col-span-1">
            <GlassPanel glowColor="#ec4899" className="min-h-[160px]">
              <h3 className="text-lg font-semibold text-white mb-4 uppercase tracking-wide text-sm">
                You Right Now
              </h3>
              <div className="text-white">
                <EnergyMoodPanel />
              </div>
            </GlassPanel>
          </div>
        </div>

        {/* Bottom: Growth strip centered */}
        <div className="pointer-events-auto flex justify-center">
          <GlassPanel glowColor="#8b5cf6" className="w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-white uppercase tracking-wide text-sm">
                Growth Arc
              </h3>
            </div>
            <div className="text-white">
              <ArcsXpPanel />
            </div>
          </GlassPanel>
        </div>
      </div>
    </motion.div>
  );
}

