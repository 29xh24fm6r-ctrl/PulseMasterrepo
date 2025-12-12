"use client";

import React from "react";
import { motion } from "framer-motion";
import { colors, scenes, getSceneConfig, SceneKey } from "@/design-system";
import { getEmotionTheme, getEmotionThemeCSS } from "@/lib/ui/emotion-theme";

interface SceneLayoutProps {
  sceneKey: SceneKey | string;
  children: React.ReactNode;
  emotion?: string | null;
  emotionIntensity?: number;
  className?: string;
}

export function SceneLayout({
  sceneKey,
  children,
  emotion,
  emotionIntensity = 0.5,
  className = "",
}: SceneLayoutProps) {
  const scene = getSceneConfig(sceneKey);
  const emotionTheme = getEmotionTheme(emotion, emotionIntensity);
  const emotionCSS = getEmotionThemeCSS(emotionTheme);

  // Get background gradient based on emotion
  const backgroundGradient =
    emotion && colors.background.gradient[emotion as keyof typeof colors.background.gradient]
      ? colors.background.gradient[emotion as keyof typeof colors.background.gradient]
      : colors.background.gradient.calm;

  return (
    <div
      className={`min-h-screen ${className}`}
      style={{
        background: backgroundGradient,
        ...emotionCSS,
      }}
    >
      {/* Ambient particles/background effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at 20% 50%, ${scene.primaryColor}15 0%, transparent 50%),
                        radial-gradient(circle at 80% 50%, ${scene.secondaryColor}15 0%, transparent 50%)`,
          }}
        />
      </div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </div>
  );
}



