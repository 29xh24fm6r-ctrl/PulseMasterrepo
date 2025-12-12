// Mosaic Layout - Asymmetric tile layout
// components/ui/pulse/MosaicLayout.tsx

"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MosaicLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function MosaicLayout({ children, className = "" }: MosaicLayoutProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn("grid gap-6", className)}
    >
      {children}
    </motion.div>
  );
}



