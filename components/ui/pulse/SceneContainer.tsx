// Scene Container - Full-page atmospheric container
// components/ui/pulse/SceneContainer.tsx

"use client";

import React from "react";
import { motion } from "framer-motion";
import { colors } from "@/design-system";
import { cn } from "@/lib/utils";

interface SceneContainerProps {
  children: React.ReactNode;
  emotion?: string | null;
  className?: string;
}

export function SceneContainer({
  children,
  emotion,
  className = "",
}: SceneContainerProps) {
  // Get emotion-based background gradient
  const getBackgroundGradient = () => {
    if (!emotion) {
      return colors.background.gradient.calm;
    }
    const emotionKey = emotion.toLowerCase();
    if (emotionKey.includes("energized") || emotionKey.includes("excited")) {
      return colors.background.gradient.energized;
    }
    if (emotionKey.includes("calm") || emotionKey.includes("peaceful")) {
      return colors.background.gradient.calm;
    }
    if (emotionKey.includes("stressed") || emotionKey.includes("overwhelmed")) {
      return colors.background.gradient.stressed;
    }
    if (emotionKey.includes("happy") || emotionKey.includes("confident")) {
      return colors.background.gradient.happy;
    }
    return colors.background.gradient.calm;
  };

  return (
    <div
      className={cn("min-h-screen relative overflow-hidden", className)}
      style={{
        background: getBackgroundGradient(),
      }}
    >
      {/* Animated noise texture */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Atmospheric particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -50, 0],
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 4,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}



