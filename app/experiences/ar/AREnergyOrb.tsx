// AR Energy Orb Component
// app/experiences/ar/AREnergyOrb.tsx

"use client";

import { motion } from "framer-motion";

interface AREnergyOrbProps {
  energy: number;
}

export function AREnergyOrb({ energy }: AREnergyOrbProps) {
  const size = 80;
  const color = energy > 0.7 ? "rgb(6, 182, 212)" : energy > 0.4 ? "rgb(59, 130, 246)" : "rgb(113, 113, 122)";

  return (
    <motion.div
      className="relative"
      animate={{
        scale: [1, 1.1, 1],
        rotate: [0, 360],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle, ${color} 0%, ${color}40 100%)`,
          boxShadow: `0 0 40px ${color}80`,
        }}
      />
      <motion.div
        className="absolute inset-0 rounded-full border-2"
        style={{ borderColor: color }}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
}



