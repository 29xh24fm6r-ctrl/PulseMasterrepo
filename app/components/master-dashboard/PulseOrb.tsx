// Pulse Orb - Central glowing orb representing Pulse core
// app/components/master-dashboard/PulseOrb.tsx

"use client";

import React from "react";
import { motion } from "framer-motion";
import { colors } from "@/design-system";

interface PulseOrbProps {
  emotion?: string | null;
  emotionIntensity?: number;
}

export function PulseOrb({ emotion, emotionIntensity = 0.5 }: PulseOrbProps) {
  // Get emotion-based colors
  const getOrbColors = () => {
    if (!emotion) {
      return {
        primary: colors.accent.purple,
        secondary: colors.accent.pink,
        glow: "rgba(139, 92, 246, 0.4)",
      };
    }
    const emotionKey = emotion.toLowerCase();
    if (emotionKey.includes("energized") || emotionKey.includes("excited")) {
      return {
        primary: colors.accent.orange,
        secondary: colors.accent.pink,
        glow: "rgba(251, 146, 60, 0.4)",
      };
    }
    if (emotionKey.includes("calm") || emotionKey.includes("peaceful")) {
      return {
        primary: colors.accent.blue,
        secondary: colors.accent.cyan,
        glow: "rgba(59, 130, 246, 0.4)",
      };
    }
    if (emotionKey.includes("stressed") || emotionKey.includes("overwhelmed")) {
      return {
        primary: colors.accent.purple,
        secondary: colors.accent.purple,
        glow: "rgba(139, 92, 246, 0.3)",
      };
    }
    return {
      primary: colors.accent.purple,
      secondary: colors.accent.pink,
      glow: "rgba(139, 92, 246, 0.4)",
    };
  };

  const orbColors = getOrbColors();

  return (
    <div className="relative">
      {/* Outer Glow Rings */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background: `radial-gradient(circle, ${orbColors.glow}, transparent 70%)`,
          filter: "blur(20px)",
        }}
      />

      {/* Main Orb */}
      <motion.div
        className="relative w-48 h-48 md:w-64 md:h-64 rounded-full"
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background: `radial-gradient(circle at 30% 30%, ${orbColors.primary}, ${orbColors.secondary})`,
          boxShadow: `0 0 60px ${orbColors.glow}, inset 0 0 40px rgba(255,255,255,0.2)`,
        }}
      >
        {/* Rotating Inner Pattern */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ rotate: 360 }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            background: `conic-gradient(from 0deg, transparent, ${orbColors.primary}20, transparent)`,
          }}
        />

        {/* Center Core */}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center"
          style={{
            background: `radial-gradient(circle, rgba(255,255,255,0.3), transparent 60%)`,
          }}
        >
          <motion.div
            className="w-16 h-16 md:w-24 md:h-24 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              background: `radial-gradient(circle, ${orbColors.primary}, ${orbColors.secondary})`,
              boxShadow: `0 0 30px ${orbColors.glow}`,
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}



