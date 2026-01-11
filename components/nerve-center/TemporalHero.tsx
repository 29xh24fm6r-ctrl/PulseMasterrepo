"use client";

import { motion } from "framer-motion";
import { useEncounter } from "@/components/encounter/EncounterContext";

export const TemporalHero = () => {
    const { resolveEncounter } = useEncounter();

    // Mock Timer Data
    const progress = 65; // 65% complete

    return (
        <div className="relative flex flex-col items-center justify-center p-20 z-10 group">

            {/* 1. THE TIME ARC (Environmental Pressure) */}
            <div className="absolute inset-0 pointer-events-none">
                <svg className="w-full h-full transform -rotate-90 opacity-20 group-hover:opacity-40 transition-opacity duration-1000">
                    <circle
                        cx="50%"
                        cy="50%"
                        r="300"
                        fill="none"
                        stroke="#27272a" /* Zinc-800 */
                        strokeWidth="1"
                    />
                    <motion.circle
                        cx="50%"
                        cy="50%"
                        r="300"
                        fill="none"
                        stroke="#ef4444" /* Red-500 */
                        strokeWidth="2"
                        strokeDasharray="1884" // 2 * pi * 300
                        strokeDashoffset={1884 * (1 - (progress / 100))}
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                    />
                </svg>
            </div>

            {/* 2. THE MONOLITH (Typography) */}
            <div className="text-center relative z-20 mix-blend-screen">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8 }}
                >
                    <span className="block text-xs font-bold text-red-500 tracking-[0.3em] uppercase mb-8">Current Focus Protocol</span>
                    <h1 className="text-7xl md:text-9xl font-bold text-white tracking-tighter leading-none mb-4">
                        DEEP<br />WORK
                    </h1>
                    <p className="text-2xl text-zinc-500 font-light tracking-wide">
                        Strategy Review
                    </p>
                </motion.div>
            </div>

            {/* 3. HARDWARE CONTROL (Complete) */}
            <motion.button
                onClick={resolveEncounter}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-16 px-12 py-4 bg-zinc-100 text-zinc-900 rounded-full font-bold tracking-widest uppercase hover:bg-white hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all"
            >
                Complete Protocol
            </motion.button>

            <div className="mt-4 text-xs font-mono text-zinc-600">
                T-MINUS 00:24:15
            </div>

        </div>
    );
};
