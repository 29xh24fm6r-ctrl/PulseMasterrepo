// AR Identity Arc Component
// app/experiences/ar/ARIdentityArc.tsx

"use client";

import { motion } from "framer-motion";

interface ARIdentityArcProps {
  emotion: string;
}

export function ARIdentityArc({ emotion }: ARIdentityArcProps) {
  return (
    <motion.svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      className="text-accent-purple"
      animate={{
        rotate: [0, 360],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      <motion.circle
        cx="60"
        cy="60"
        r="50"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="314"
        strokeDashoffset={314 * (1 - 0.7)}
        animate={{
          strokeDashoffset: [314 * 0.3, 314 * 0.2, 314 * 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.svg>
  );
}



