"use client";

import React from "react";
import { motion } from "framer-motion";
import { colors, shadows } from "@/design-system";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  elevation?: "z1" | "z2" | "z3" | "z4";
  hover?: boolean;
  onClick?: () => void;
}

export function GlassPanel({
  children,
  className = "",
  elevation = "z2",
  hover = false,
  onClick,
}: GlassPanelProps) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={hover ? { scale: 1.02, y: -2 } : {}}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl backdrop-blur-xl border ${className} ${
        onClick ? "cursor-pointer" : ""
      }`}
      style={{
        background: colors.glass.panel,
        borderColor: colors.border.glass,
        boxShadow: shadows[elevation].glass,
      }}
    >
      {children}
    </motion.div>
  );
}



