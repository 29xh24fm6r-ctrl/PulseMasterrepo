// Energy & Mood Panel
// app/components/life-dashboard/EnergyMoodPanel.tsx

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { CoachLauncher } from "@/app/components/coaching/CoachLauncher";

interface EmotionState {
  detected_emotion?: string;
  intensity?: number;
}

export function EnergyMoodPanel() {
  const [emotion, setEmotion] = useState<EmotionState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmotion();
  }, []);

  async function loadEmotion() {
    try {
      const res = await fetch("/api/emotion/current");
      if (res.ok) {
        const data = await res.json();
        setEmotion(data.emotion || {});
      }
    } catch (err) {
      console.error("Failed to load emotion:", err);
    } finally {
      setLoading(false);
    }
  }

  const emotionLabel = emotion?.detected_emotion || "neutral";
  const intensity = emotion?.intensity || 0;

  return (
    <AppCard
      title="You Right Now"
      description="Emotion & energy"
      actions={
        <CoachLauncher
          coachKey="confidant"
          origin="life.energy"
          variant="button"
          size="sm"
        />
      }
    >
      {loading ? (
        <LoadingState message="Loading emotion data…" />
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <motion.div
              className="absolute -inset-1 bg-amber-500/20 rounded-full blur-sm"
              animate={{ opacity: [0.6, 0.9, 0.6] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative">
              <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Today's Emotion</div>
              <motion.div
                className="text-2xl font-semibold text-white capitalize mb-1"
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                {emotionLabel}
              </motion.div>
              {intensity > 0 && (
                <div className="text-xs text-zinc-500">
                  Intensity: {Math.round(intensity * 100)}%
                </div>
              )}
            </div>
          </div>
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                <span>Stress</span>
                <span className="font-medium">50%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: "50%" }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                <span>Energy</span>
                <span className="font-medium">65%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: "65%" }}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-zinc-500 italic">
            Energy feels stable • Mood trending up
          </p>
        </div>
      )}
    </AppCard>
  );
}

