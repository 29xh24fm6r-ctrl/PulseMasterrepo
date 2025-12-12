// Spotlight Panel - Dominant center-aligned panel
// components/ui/pulse/SpotlightPanel.tsx

"use client";

import React from "react";
import { motion } from "framer-motion";
import { GlassPanel } from "./GlassPanel";
import { cn } from "@/lib/utils";

interface SpotlightPanelProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function SpotlightPanel({
  children,
  className = "",
  title,
  subtitle,
}: SpotlightPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex justify-center mb-12"
    >
      <div className="w-full max-w-[1100px]">
        <GlassPanel elevation="z4" hover className={cn("p-10", className)}>
          {(title || subtitle) && (
            <div className="mb-8">
              {title && (
                <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-2">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-md text-gray-600">{subtitle}</p>
              )}
            </div>
          )}
          {children}
        </GlassPanel>
      </div>
    </motion.div>
  );
}



