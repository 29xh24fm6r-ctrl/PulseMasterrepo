"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PrismCardProps {
    children: ReactNode;
    className?: string;
    intensity?: "LOW" | "MEDIUM" | "HIGH";
}

export const PrismCard = ({ children, className = "", intensity = "MEDIUM" }: PrismCardProps) => {

    // Border opacity based on intensity
    const borderColor = intensity === "HIGH" ? "border-white/20" : "border-white/10";
    const bgOpacity = intensity === "HIGH" ? "bg-white/10" : "bg-white/5";

    return (
        <motion.div
            className={`relative group rounded-3xl overflow-hidden backdrop-blur-2xl border ${borderColor} ${bgOpacity} shadow-2xl ${className}`}
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.4 }}
        >
            {/* The Content */}
            <div className="relative z-10 h-full">
                {children}
            </div>

            {/* The Internal Prism Glow (Hover) */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none" />

            {/* The Rim Light */}
            <div className="absolute inset-0 rounded-3xl border border-white/10 pointer-events-none" />
        </motion.div>
    );
};
