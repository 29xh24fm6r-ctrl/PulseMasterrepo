"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEncounter } from "./EncounterContext";

export const TheVoid = () => {
    const { state, situationText, oneThing, actionLabel, isResolved, resolveEncounter } = useEncounter();
    const [isHoveringCenter, setIsHoveringCenter] = useState(false);
    const [hasRevealed, setHasRevealed] = useState(false);

    // Mouse Physics
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springConfig = { damping: 25, stiffness: 70 };
    const smoothX = useSpring(mouseX, springConfig);
    const smoothY = useSpring(mouseY, springConfig);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };
        // Safe window check
        if (typeof window !== 'undefined') {
            window.addEventListener("mousemove", handleMouseMove);
            return () => window.removeEventListener("mousemove", handleMouseMove);
        }
    }, [mouseX, mouseY]);

    // Dwell Logic for Reveal
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isHoveringCenter && !hasRevealed && state !== 'CLEAR') {
            timer = setTimeout(() => {
                setHasRevealed(true);
            }, 600); // 600ms dwell
        }
        return () => clearTimeout(timer);
    }, [isHoveringCenter, hasRevealed, state]);

    // Colors mapping
    const bgColors = {
        CLEAR: "bg-[#050508]", // Void Violet
        PRESSURE: "bg-[#080505]", // Warmer dark
        HIGH_COST: "bg-[#0a0202]", // Deepest red-black
    };

    if (isResolved) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1 } }}
            className={`fixed inset-0 z-[100] overflow-hidden ${bgColors[state]} cursor-none`}
            onClick={() => {
                if (state === 'CLEAR') resolveEncounter();
            }}
        >
            {/* 1. Living Organic Noise */}
            <div className="absolute inset-0 opacity-[0.05] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http%22://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')] pointer-events-none mix-blend-overlay" />

            {/* 2. Bioluminescent Spotting (Mouse Follower) */}
            <motion.div
                style={{
                    x: smoothX,
                    y: smoothY,
                    translateX: "-50%",
                    translateY: "-50%"
                }}
                className="absolute w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-[120px] pointer-events-none mix-blend-screen"
            />

            {/* 3. Center Gravity Well (Pressure State) */}
            {state !== 'CLEAR' && (
                <motion.div
                    animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[150px] pointer-events-none
                        ${state === 'PRESSURE' ? 'bg-amber-900/10' : 'bg-red-900/10'}
                    `}
                />
            )}

            {/* 4. Content Layer */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">

                {/* Situation Text */}
                <motion.div
                    onMouseEnter={() => setIsHoveringCenter(true)}
                    onMouseLeave={() => setIsHoveringCenter(false)}
                    className="flex flex-col items-center cursor-default p-20"
                >
                    <motion.h1
                        initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
                        animate={{
                            opacity: hasRevealed ? 0.4 : 0.9,
                            y: hasRevealed ? -20 : 0,
                            filter: "blur(0px)"
                        }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="text-3xl md:text-4xl font-light tracking-tight text-white/90 text-center font-sans antialiased"
                    >
                        {situationText}
                    </motion.h1>

                    {/* The Reveal */}
                    <AnimatePresence>
                        {hasRevealed && (
                            <motion.div
                                initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                exit={{ opacity: 0, y: 20 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="mt-8 flex flex-col items-center gap-6"
                            >
                                <p className="text-xl text-zinc-400 font-light tracking-wide text-center max-w-lg leading-relaxed">
                                    {oneThing}
                                </p>

                                <button
                                    onClick={resolveEncounter}
                                    className="group relative px-6 py-3 overflow-hidden rounded-full transition-all duration-500"
                                >
                                    <span className="relative z-10 text-sm uppercase tracking-[0.2em] text-zinc-500 group-hover:text-white transition-colors duration-500">
                                        {actionLabel}
                                    </span>
                                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-zinc-800 group-hover:bg-white/50 transition-colors duration-500" />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Clear State Hint - Removed for Silence Discipline */}
                    {/* state === 'CLEAR' && ... Click anywhere to begin ... removed */}
                </motion.div>
            </div>
        </motion.div>
    );
}
