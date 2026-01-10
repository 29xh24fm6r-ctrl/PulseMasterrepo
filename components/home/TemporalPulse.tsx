"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { useEncounter } from "@/components/encounter/EncounterContext";

export const TemporalPulse = () => {
    const [time, setTime] = useState<Date | null>(null);
    const { state } = useEncounter();

    useEffect(() => {
        setTime(new Date());
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (!time) return <div className="h-32" />; // Avoid hydration mismatch

    const hours = time.toLocaleTimeString("en-US", { hour: "2-digit", hour12: false }).split(":")[0];
    const minutes = time.toLocaleTimeString("en-US", { minute: "2-digit" });
    const dateString = time.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

    // State-based Visuals (Pass 3 & Authoritative Refinement)
    const stateVisuals = {
        // CLEAR: Stable State. System Nominal.
        CLEAR: { tracking: "tracking-widest", scale: 0.8, gap: "gap-12", opacity: 0.2, blur: "blur(0px)" }, // Recessed
        // PRESSURE: Subtle compression. Gap reduced, tracking tightened.
        PRESSURE: { tracking: "tracking-tight", scale: 0.95, gap: "gap-2", opacity: 1, blur: "blur(0px)" },
        // HIGH_COST: Narrow focus. Zero gap, slight overlap.
        HIGH_COST: { tracking: "tracking-tighter", scale: 1.1, gap: "gap-0", opacity: 1, blur: "blur(0.5px)" }
    };

    const visual = stateVisuals[state] || stateVisuals.CLEAR;

    return (
        <div className="relative flex flex-col items-center justify-center py-12 select-none">
            {/* Glow backing */}
            <div className={`absolute inset-0 rounded-full pointer-events-none transition-all duration-1000
                ${state === 'HIGH_COST' ? 'bg-red-500/10 blur-[80px]' :
                    state === 'PRESSURE' ? 'bg-amber-500/5 blur-[90px]' :
                        'bg-violet-500/5 blur-[100px]'}
            `} />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                animate={{
                    opacity: visual.opacity,
                    scale: visual.scale,
                    filter: visual.blur,
                    gap: state === 'HIGH_COST' ? '0rem' : state === 'PRESSURE' ? '0.5rem' : '1rem'
                }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className={`relative z-10 flex items-baseline font-bold text-white/90 transition-all duration-1000 ${visual.gap}`}
                style={{ textShadow: state === 'HIGH_COST' ? "0 0 40px rgba(220, 38, 38, 0.5)" : "0 0 80px rgba(139, 92, 246, 0.3)" }}
            >
                <span className={`text-8xl md:text-[10rem] leading-none font-sans bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 transition-all duration-1000 ${visual.tracking}`}>
                    {hours}
                </span>

                <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: state === 'PRESSURE' ? 1 : 2, repeat: Infinity, ease: "easeInOut" }}
                    className="text-6xl md:text-8xl text-violet-400/50 -translate-y-8"
                >
                    :
                </motion.span>

                <span className={`text-8xl md:text-[10rem] leading-none font-sans bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 transition-all duration-1000 ${visual.tracking}`}>
                    {minutes}
                </span>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 1 }}
                className="flex items-center gap-3 mt-4"
            >
                <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-zinc-500" />
                <span className="text-sm md:text-base font-light tracking-[0.3em] uppercase text-zinc-400">
                    {dateString}
                </span>
                <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-zinc-500" />
            </motion.div>
        </div>
    );
};
