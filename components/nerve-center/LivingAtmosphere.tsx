"use client";

import { motion, AnimatePresence } from "framer-motion";

interface LivingAtmosphereProps {
    status: "CALM" | "DRIFT" | "CRISIS";
}

export const LivingAtmosphere = ({ status }: LivingAtmosphereProps) => {
    // Map states to "Atmospheres"
    const gradients = {
        CALM: "from-[#1a140e] via-black to-[#0c0c0c]", // Warm/Gold Trace
        DRIFT: "from-[#0f111a] via-black to-[#050505]", // Cool/Indigo Trace
        CRISIS: "from-[#220a0a] via-black to-[#0a0a0a]", // Deep Red Trace
    };

    const accentGlow = {
        CALM: "bg-amber-500/5",
        DRIFT: "bg-indigo-500/5",
        CRISIS: "bg-red-500/10",
    };

    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <AnimatePresence mode="wait">
                <motion.div
                    key={status} // Key changes trigger exit/enter
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2.5, ease: "easeInOut" }} // Slow, breathing transition
                    className={`absolute inset-0 bg-gradient-to-br ${gradients[status]}`}
                />
            </AnimatePresence>

            {/* Subtle Pulse Layer */}
            <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute inset-0 ${accentGlow[status]} blur-3xl`}
            />

            {/* Grain Overlay for Texture */}
            <div className="absolute inset-0 opacity-[0.03] bg-[url('/noise.png')] mix-blend-overlay" />
        </div>
    );
};
