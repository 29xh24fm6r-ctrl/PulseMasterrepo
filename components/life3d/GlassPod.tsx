// Glass Pod - Circular/rounded pod for radial HUD
// components/life3d/GlassPod.tsx

"use client";

import React from "react";
import { motion } from "framer-motion";

interface GlassPodProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export function GlassPod({ children, className = "", glowColor }: GlassPodProps) {
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
      className={`rounded-3xl bg-white/12 border border-white/30 backdrop-blur-2xl p-6 ${className}`}
      style={{
        boxShadow: glowColor
          ? `0 10px 40px rgba(0,0,0,0.5), 0 0 30px ${glowColor}20`
          : "0 10px 40px rgba(0,0,0,0.5)",
      }}
    >
      {children}
    </motion.div>
  );
}



