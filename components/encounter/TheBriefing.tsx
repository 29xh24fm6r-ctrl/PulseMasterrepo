"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEncounter } from "./EncounterContext";

export const TheBriefing = () => {
    const { state, situationText, oneThing, actionLabel, isResolved, resolveEncounter, isAligning } = useEncounter();

    // Auto-Resolve Logic for Briefing
    // If it's a simple status, we show it then fade to dash.
    // If it's a critical insight, we wait for dismissal.

    useEffect(() => {
        if (!isResolved && !isAligning && situationText) {
            const readTime = Math.max(2000, situationText.split(" ").length * 300);
            // Auto-resolve after reading specific insight, unless it requires action?
            // User wants "Immediate Overview". 
            // Let's keep the "Guardrails" logic: 
            // If state is CLEAR/STABLE -> Auto resolve.
            // If PRESSURE -> Wait.

            if (state === 'CLEAR') {
                const timer = setTimeout(() => {
                    resolveEncounter();
                }, readTime);
                return () => clearTimeout(timer);
            }
        }
    }, [isResolved, isAligning, situationText, state, resolveEncounter]);

    if (isResolved) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black cursor-default text-center px-4"
            onClick={() => {
                // Allow click to dismiss immediately
                resolveEncounter();
            }}
        >
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[50vh]">

                {/* 1. Loading State (Aligning) */}
                <AnimatePresence mode="wait">
                    {isAligning ? (
                        <motion.div
                            key="aligning"
                            initial={{ opacity: 0, filter: "blur(10px)" }}
                            animate={{ opacity: 1, filter: "blur(0px)" }}
                            exit={{ opacity: 0, filter: "blur(10px)", y: -20 }}
                            className="text-zinc-500 font-light tracking-[0.2em] text-sm uppercase animate-pulse"
                        >
                            Pulse is aligning...
                        </motion.div>
                    ) : (
                        <motion.div
                            key="insight"
                            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        >
                            {/* 2. The Insight */}
                            <h1 className="text-3xl md:text-5xl lg:text-6xl font-light text-white leading-tight tracking-tight mb-8">
                                {situationText}
                            </h1>

                            {/* 3. Action / Subtext */}
                            {oneThing && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5, duration: 1 }}
                                    className="text-lg text-zinc-400 font-light max-w-2xl mx-auto"
                                >
                                    {oneThing}
                                </motion.p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Ambient Background Gradient (Subtle) */}
            <div className="absolute inset-0 pointer-events-none z-[-1] bg-gradient-to-b from-transparent via-violet-900/5 to-transparent opacity-20" />

        </motion.div>
    );
};
