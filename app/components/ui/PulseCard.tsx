"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface PulseCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

export function PulseCard({ 
  children, 
  className, 
  hover = true,
  glow = false,
  onClick 
}: PulseCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onClick={onClick}
      className={cn(
        "glass-card rounded-2xl p-6",
        hover && "hover-lift cursor-pointer",
        glow && "glow-soft",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

