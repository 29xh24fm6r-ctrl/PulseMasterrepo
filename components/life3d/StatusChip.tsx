// Status Chip - Small chip for quick status display
// components/life3d/StatusChip.tsx

"use client";

import React from "react";
import { motion } from "framer-motion";

interface StatusChipProps {
  label: string;
  value: string;
  onClick?: () => void;
}

export function StatusChip({ label, value, onClick }: StatusChipProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl text-white text-sm font-medium hover:bg-white/15 transition-colors"
    >
      <span className="text-white/70">{label}:</span>{" "}
      <span className="font-semibold">{value}</span>
    </motion.button>
  );
}



