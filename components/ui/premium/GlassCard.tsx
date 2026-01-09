"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

export function GlassCard({ children, className = "", hoverEffect = true }: GlassCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={hoverEffect ? { y: -4 } : {}}
            className={`relative bg-zinc-900/50 border border-white/5 rounded-2xl p-5 backdrop-blur-sm transition-all ${hoverEffect ? "hover:border-violet-500/30 group" : ""
                } ${className}`}
        >
            {children}
            {hoverEffect && (
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl pointer-events-none transition-opacity" />
            )}
        </motion.div>
    );
}
