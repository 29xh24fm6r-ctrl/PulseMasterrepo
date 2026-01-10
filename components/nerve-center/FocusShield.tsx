"use client";

import { motion } from "framer-motion";
import { Shield, Zap, Circle } from "lucide-react";

interface FocusShieldProps {
    status: "LOCKED" | "OPEN" | "ENGAGED";
    label?: string;
    subLabel?: string;
}

export const FocusShield = ({ status, label, subLabel }: FocusShieldProps) => {
    // Animation variants based on status
    const shieldVariants = {
        LOCKED: {
            scale: 1,
            opacity: 1,
            borderColor: "rgba(255, 255, 255, 0.8)",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            boxShadow: "0 0 40px -10px rgba(255, 255, 255, 0.2)"
        },
        OPEN: {
            scale: [1, 1.05, 1],
            opacity: 0.8,
            borderColor: "rgba(139, 92, 246, 0.3)", // Violet
            backgroundColor: "rgba(139, 92, 246, 0.02)",
            boxShadow: "0 0 60px -20px rgba(139, 92, 246, 0.3)",
            transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
        },
        ENGAGED: {
            scale: 1.1,
            opacity: 1,
            borderColor: "rgba(16, 185, 129, 0.5)", // Emerald
            backgroundColor: "rgba(16, 185, 129, 0.05)",
            boxShadow: "0 0 50px -10px rgba(16, 185, 129, 0.2)"
        }
    };

    return (
        <div className="relative flex flex-col items-center justify-center">
            {/* The Shield Core */}
            <motion.div
                initial={false}
                animate={status}
                variants={shieldVariants}
                className="w-64 h-64 rounded-full border-2 flex items-center justify-center backdrop-blur-md relative z-10"
            >
                {status === "LOCKED" && <Shield className="w-16 h-16 text-white/80" strokeWidth={1} />}
                {status === "OPEN" && <Circle className="w-16 h-16 text-violet-400/80" strokeWidth={0.5} />}
                {status === "ENGAGED" && <Zap className="w-16 h-16 text-emerald-400/80" strokeWidth={1.5} />}

                {/* Ripples for Open state */}
                {status === "OPEN" && (
                    <motion.div
                        animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
                        className="absolute w-full h-full rounded-full border border-violet-500/30"
                    />
                )}
            </motion.div>

            {/* Labels - Only Secondary */}
            <div className="absolute mt-80 text-center space-y-1">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-lg font-medium tracking-wide text-white/90"
                >
                    {label}
                </motion.div>
                {subLabel && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-xs uppercase tracking-[0.2em] text-white/40"
                    >
                        {subLabel}
                    </motion.div>
                )}
            </div>
        </div>
    );
};
