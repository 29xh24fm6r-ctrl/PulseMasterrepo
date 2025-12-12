// Wellness Core Panel
// app/components/master-dashboard/panels/WellnessCorePanel.tsx

"use client";

import React from "react";
import { motion } from "framer-motion";
import { GlowPanel } from "@/components/ui/pulse";
import { Button } from "@/components/ui/button";
import { Heart, Activity, Moon, TrendingUp } from "lucide-react";
import Link from "next/link";
import { colors } from "@/design-system";

interface WellnessCorePanelProps {
  data: any;
}

export function WellnessCorePanel({ data }: WellnessCorePanelProps) {
  return (
    <GlowPanel emotion={data.emotion} hover className="p-8 rounded-3xl h-full">
      <div className="flex items-center gap-3 mb-6">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Heart className="w-7 h-7 text-green-500" />
        </motion.div>
        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Wellness Core</h2>
      </div>

      <div className="space-y-6">
        {/* Stress Curve */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Stress Level</span>
            <span className="text-lg font-bold text-green-600">{data.stressLevel || 25}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: colors.status.success }}
              initial={{ width: 0 }}
              animate={{ width: `${data.stressLevel || 25}%` }}
              transition={{ delay: 0.5, duration: 1 }}
            />
          </div>
        </div>

        {/* Energy Curve */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Energy Level</span>
            <span className="text-lg font-bold text-green-600">{data.energyLevel || 85}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: colors.status.success }}
              initial={{ width: 0 }}
              animate={{ width: `${data.energyLevel || 85}%` }}
              transition={{ delay: 0.5, duration: 1 }}
            />
          </div>
        </div>

        {/* Momentum Score */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-sm font-semibold text-gray-700">Momentum Score</span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900">High</div>
        </div>

        {/* CTA */}
        <Button
          asChild
          size="lg"
          className="w-full font-semibold"
          style={{
            background: colors.scene.wellness.gradient,
            color: "white",
          }}
        >
          <Link href="/wellness">Open Vitality Lab</Link>
        </Button>
      </div>
    </GlowPanel>
  );
}

