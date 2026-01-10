"use client";

import { motion } from "framer-motion";

interface PressureFieldProps {
    intensity: "LOW" | "MEDIUM" | "HIGH";
}

export const PressureField = ({ intensity }: PressureFieldProps) => {
    // LOW: Open, breathable, expansive. Violet/Blue hints.
    // MEDIUM: Neutral, slightly heavier. Zinc/Gray.
    // HIGH: Compressive, encroaching. Amber/Red hints.

    const gradientVariants = {
        LOW: {
            background: "radial-gradient(circle at center, transparent 30%, rgba(139, 92, 246, 0.05) 70%, rgba(0,0,0,0.8) 100%)",
            opacity: 0.5
        },
        MEDIUM: {
            background: "radial-gradient(circle at center, transparent 20%, rgba(113, 113, 122, 0.1) 60%, rgba(0,0,0,0.9) 100%)",
            opacity: 0.8
        },
        HIGH: {
            background: "radial-gradient(circle at center, transparent 10%, rgba(245, 158, 11, 0.08) 50%, rgba(0,0,0,0.95) 100%)",
            opacity: 1
        }
    };

    return (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            {/* Ambient Base */}
            <motion.div
                animate={intensity}
                variants={gradientVariants}
                transition={{ duration: 2 }}
                className="absolute inset-0 w-full h-full"
            />

            {/* High Pressure Vignette Pulse */}
            {intensity === "HIGH" && (
                <motion.div
                    animate={{ opacity: [0, 0.3, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 w-full h-full bg-[radial-gradient(circle_at_center,transparent_0%,rgba(245,158,11,0.1)_100%)]"
                />
            )}

            {/* Particles or Grain could go here */}
        </div>
    );
};
