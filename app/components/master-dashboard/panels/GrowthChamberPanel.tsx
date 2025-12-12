// Growth Chamber Panel
// app/components/master-dashboard/panels/GrowthChamberPanel.tsx

"use client";

import React from "react";
import { motion } from "framer-motion";
import { GlassPanel } from "@/components/ui/pulse";
import { Button } from "@/components/ui/button";
import { Rocket, Target, Sparkles } from "lucide-react";
import Link from "next/link";
import { colors } from "@/design-system";

interface GrowthChamberPanelProps {
  data: any;
}

export function GrowthChamberPanel({ data }: GrowthChamberPanelProps) {
  return (
    <GlassPanel hover elevation="z2" className="p-8 rounded-3xl h-full">
      <div className="flex items-center gap-3 mb-6">
        <Rocket className="w-7 h-7 text-orange-600" />
        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Growth Chamber</h2>
      </div>

      <div className="space-y-6">
        {/* Active Arc */}
        <div className="p-4 rounded-xl bg-orange-50">
          <div className="text-xs text-gray-600 mb-2">Active Arc</div>
          <div className="text-lg font-bold text-gray-900">Career Mastery</div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: colors.accent.orange }}
              initial={{ width: 0 }}
              animate={{ width: "65%" }}
              transition={{ delay: 0.5, duration: 1 }}
            />
          </div>
        </div>

        {/* Current Level Badge */}
        <div className="flex items-center justify-center">
          <motion.div
            className="w-24 h-24 rounded-full border-4 flex items-center justify-center"
            style={{
              borderColor: colors.accent.orange,
              background: "rgba(251, 146, 60, 0.1)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          >
            <div className="text-center">
              <div className="text-2xl font-extrabold text-gray-900">12</div>
              <div className="text-xs text-gray-600">Level</div>
            </div>
          </motion.div>
        </div>

        {/* Upcoming Missions */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">Upcoming Missions</div>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="p-3 rounded-lg bg-gray-50 flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-gray-700">Mission {i}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Button
          asChild
          size="lg"
          className="w-full font-semibold"
          style={{
            background: colors.scene.growth.gradient,
            color: "white",
          }}
        >
          <Link href="/growth">Open Ascension Chamber</Link>
        </Button>
      </div>
    </GlassPanel>
  );
}

