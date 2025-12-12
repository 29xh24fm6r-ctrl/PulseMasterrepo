// AR Butler Node Component
// app/experiences/ar/ARButlerNode.tsx

"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function ARButlerNode() {
  return (
    <motion.div
      className="relative"
      animate={{
        y: [0, -10, 0],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-white" />
      </div>
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-accent-cyan"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.6, 0, 0.6],
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



