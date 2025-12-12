// Glow Panel - Elevated panel with gradient glow
// components/ui/pulse/GlowPanel.tsx

"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { colors } from "@/design-system";

interface GlowPanelProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  emotion?: string | null;
}

export function GlowPanel({
  children,
  className = "",
  hover = false,
  onClick,
  emotion,
}: GlowPanelProps) {
  // Get emotion-based gradient
  const getGradient = () => {
    if (!emotion) {
      return "linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))";
    }
    const emotionKey = emotion.toLowerCase();
    if (emotionKey.includes("energized") || emotionKey.includes("excited")) {
      return "linear-gradient(135deg, rgba(251, 146, 60, 0.2), rgba(236, 72, 153, 0.2))";
    }
    if (emotionKey.includes("calm") || emotionKey.includes("peaceful")) {
      return "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(6, 182, 212, 0.2))";
    }
    if (emotionKey.includes("stressed") || emotionKey.includes("overwhelmed")) {
      return "linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.1))";
    }
    return "linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))";
  };

  const getGlowColor = () => {
    if (!emotion) return "rgba(139, 92, 246, 0.15)";
    const emotionKey = emotion.toLowerCase();
    if (emotionKey.includes("energized")) return "rgba(251, 146, 60, 0.15)";
    if (emotionKey.includes("calm")) return "rgba(59, 130, 246, 0.15)";
    return "rgba(139, 92, 246, 0.15)";
  };

  return (
    <motion.div
      onClick={onClick}
      whileHover={hover ? { scale: 1.015, y: -2 } : {}}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-3xl backdrop-blur-lg border transition-all",
        onClick && "cursor-pointer",
        className
      )}
      style={{
        background: getGradient(),
        backdropFilter: "blur(16px)",
        borderColor: "rgba(139, 92, 246, 0.2)",
        boxShadow: `0 4px 40px ${getGlowColor()}`,
      }}
    >
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}



