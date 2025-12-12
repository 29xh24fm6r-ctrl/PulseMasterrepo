// Glass Panel - Core visual primitive
// components/ui/pulse/GlassPanel.tsx

"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  elevation?: "z1" | "z2" | "z3" | "z4";
}

export function GlassPanel({
  children,
  className = "",
  hover = false,
  onClick,
  elevation = "z2",
}: GlassPanelProps) {
  const shadowMap = {
    z1: "0px 4px 20px rgba(0,0,0,0.08)",
    z2: "0px 8px 30px rgba(0,0,0,0.12)",
    z3: "0px 12px 40px rgba(0,0,0,0.16)",
    z4: "0px 16px 50px rgba(0,0,0,0.20)",
  };

  return (
    <motion.div
      onClick={onClick}
      whileHover={hover ? { scale: 1.015, y: -2 } : {}}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-3xl backdrop-blur-lg border transition-all",
        onClick && "cursor-pointer",
        className
      )}
      style={{
        background: "rgba(255, 255, 255, 0.2)",
        backdropFilter: "blur(16px)",
        borderColor: "rgba(255, 255, 255, 0.3)",
        boxShadow: shadowMap[elevation],
      }}
    >
      {/* Light gradient overlay */}
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none opacity-30"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}



