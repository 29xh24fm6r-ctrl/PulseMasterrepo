// Glass Panel - Shared component for HUD panels
// components/life3d/GlassPanel.tsx

"use client";

import React from "react";
import { motion } from "framer-motion";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export function GlassPanel({ children, className = "", glowColor }: GlassPanelProps) {
  return (
    <motion.div
      animate={{
        y: [0, -3, 0],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={`bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 ${className}`}
      style={{
        boxShadow: glowColor
          ? `0 18px 60px rgba(0,0,0,0.45), 0 0 40px ${glowColor}20`
          : "0 18px 60px rgba(0,0,0,0.45)",
      }}
    >
      {children}
    </motion.div>
  );
}

