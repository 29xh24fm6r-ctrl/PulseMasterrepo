// Butler Button - Floating Action Button
// app/components/butler/ButlerButton.tsx

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ButlerPanel } from "./ButlerPanel";

interface ButlerButtonProps {
  hasAttention?: boolean;
  persona?: string;
}

export function ButlerButton({ hasAttention = false, persona }: ButlerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.button
        className={cn(
          "fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center shadow-z3-glow z-50",
          hasAttention && "ring-4 ring-accent-cyan ring-opacity-50"
        )}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          scale: hasAttention ? [1, 1.05, 1] : 1,
        }}
        transition={{
          duration: 2,
          repeat: hasAttention ? Infinity : 0,
          ease: "easeInOut",
        }}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Zap className="w-6 h-6 text-white" />
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <ButlerPanel onClose={() => setIsOpen(false)} persona={persona} />
        )}
      </AnimatePresence>
    </>
  );
}



