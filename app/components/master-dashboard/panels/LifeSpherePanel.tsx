// Life Sphere Panel
// app/components/master-dashboard/panels/LifeSpherePanel.tsx

"use client";

import React from "react";
import { motion } from "framer-motion";
import { GlassPanel } from "@/components/ui/pulse";
import { Button } from "@/components/ui/button";
import { Heart, Target, Sparkles, Brain } from "lucide-react";
import Link from "next/link";
import { colors } from "@/design-system";

interface LifeSpherePanelProps {
  data: any;
}

export function LifeSpherePanel({ data }: LifeSpherePanelProps) {
  return (
    <GlassPanel hover elevation="z3" className="p-10 rounded-3xl">
      <div className="flex items-center gap-3 mb-6">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Heart className="w-8 h-8 text-purple-600" />
        </motion.div>
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">Life Sphere</h2>
      </div>

      <div className="space-y-6">
        {/* Emotion State Visual */}
        <div className="p-6 rounded-2xl" style={{ background: "rgba(139, 92, 246, 0.1)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Emotion State</span>
            <span className="text-lg font-bold text-purple-600">{data.emotion || "Calm"}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: colors.accent.purple }}
              initial={{ width: 0 }}
              animate={{ width: `${(data.emotionIntensity || 0.5) * 100}%` }}
              transition={{ delay: 0.5, duration: 1 }}
            />
          </div>
        </div>

        {/* Today's Focus Preview */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-purple-600" />
            <span className="text-lg font-semibold text-gray-800">Today's Focus</span>
          </div>
          <p className="text-md text-gray-600">Your energy is stable and focus is trending up</p>
        </div>

        {/* XP Rings */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-3xl font-extrabold text-gray-900">{data.xpTotal || 0}</div>
            <div className="text-sm text-gray-600">Total XP</div>
          </div>
          <div className="flex-1 h-16 flex items-center justify-center">
            <motion.div
              className="w-16 h-16 rounded-full border-4 border-purple-200 flex items-center justify-center"
              style={{ borderTopColor: colors.accent.purple }}
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-6 h-6 text-purple-600" />
            </motion.div>
          </div>
        </div>

        {/* Twin Insight */}
        <div className="p-4 rounded-xl" style={{ background: "rgba(139, 92, 246, 0.05)" }}>
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">
              You're building momentum in your career arc. Keep the focus.
            </p>
          </div>
        </div>

        {/* CTA */}
        <Button
          asChild
          size="lg"
          className="w-full font-semibold"
          style={{
            background: colors.scene.life.gradient,
            color: "white",
          }}
        >
          <Link href="/life">Open Life Command Center</Link>
        </Button>
      </div>
    </GlassPanel>
  );
}

