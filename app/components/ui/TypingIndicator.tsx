// Typing Indicator Component
// app/components/ui/TypingIndicator.tsx

"use client";

import { motion } from "framer-motion";

export function TypingIndicator() {
  return (
    <motion.div
      className="flex gap-1 items-center text-xs text-zinc-500"
      aria-label="Coach is thinking"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.span
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
        className="w-1.5 h-1.5 rounded-full bg-zinc-500"
      />
      <motion.span
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }}
        className="w-1.5 h-1.5 rounded-full bg-zinc-500"
      />
      <motion.span
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
        className="w-1.5 h-1.5 rounded-full bg-zinc-500"
      />
    </motion.div>
  );
}




