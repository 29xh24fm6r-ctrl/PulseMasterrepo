"use client";

import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";
import { Zap, Mail, Calendar, CheckCircle } from "lucide-react";

// ============================================
// GHOST OVERLAY (PRECOGNITION LAYER)
// ============================================
// this component sits on top of everything (z-50) but allows clicking through (pointer-events-none)
// unless interacting with a Ghost.

interface GhostAction {
    id: string;
    x: number;
    y: number;
    label: string;
    icon: any;
    probability: number; // 0 to 1
}

export function GhostOverlay() {
    const [ghosts, setGhosts] = useState<GhostAction[]>([]);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Magnetic Cursor Spring
    const cursorX = useSpring(mouseX, { stiffness: 500, damping: 28 });
    const cursorY = useSpring(mouseY, { stiffness: 500, damping: 28 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);

            // MOCK PRECOGNITION LOGIC
            // In reality, this would query the DOM or Cortex for elements under the cursor
            // and project "likely actions".

            // Simulating a "Ghost" appearing when hovering near the center of the screen
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const dist = Math.sqrt(Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2));

            if (dist < 100) {
                // We are near the "Center" (e.g. focused on the main content)
                // Project a "Deep Work" ghost
                setGhosts([{
                    id: "deep-work-ghost",
                    x: centerX + 100,
                    y: centerY - 50,
                    label: "Start Focus Block",
                    icon: Zap,
                    probability: 0.95
                }]);
            } else {
                setGhosts([]);
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX, mouseY]);

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">

            {/* 1. Magnetic Cursor Highlight (The "Intent Field") */}
            <motion.div
                className="absolute w-64 h-64 bg-violet-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"
                style={{ x: cursorX, y: cursorY }}
            />

            {/* 2. Ghost Actions (The "Probable Futures") */}
            <AnimatePresence>
                {ghosts.map(ghost => (
                    <motion.div
                        key={ghost.id}
                        initial={{ opacity: 0, scale: 0.8, x: ghost.x, y: ghost.y }}
                        animate={{ opacity: 1, scale: 1, x: ghost.x, y: ghost.y }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute pointer-events-auto cursor-pointer"
                        onClick={() => {
                            console.log(`🔮 Collapsed Wavefunction: ${ghost.label}`);
                            // TODO: Trigger Cortex Action
                            alert(`Precognition Executed: ${ghost.label}`);
                        }}
                    >
                        <div className="relative group">
                            {/* Probability Ring */}
                            <svg className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] rotate-[-90deg]">
                                <circle
                                    r="24"
                                    cx="50%"
                                    cy="50%"
                                    fill="transparent"
                                    stroke="rgba(139, 92, 246, 0.3)"
                                    strokeWidth="2"
                                    strokeDasharray="150"
                                    strokeDashoffset={150 - (150 * ghost.probability)}
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>

                            {/* The Ghost Button */}
                            <div className="
                 flex items-center gap-2 px-4 py-2 
                 bg-zinc-950/80 backdrop-blur-xl 
                 border border-violet-500/30 
                 rounded-full 
                 shadow-[0_0_30px_rgba(139,92,246,0.2)]
                 group-hover:bg-violet-600 group-hover:border-violet-400 group-hover:shadow-[0_0_50px_rgba(139,92,246,0.6)]
                 transition-all duration-300
               ">
                                <ghost.icon className="w-4 h-4 text-violet-300 group-hover:text-white" />
                                <span className="text-sm font-medium text-violet-100 group-hover:text-white">
                                    {ghost.label}
                                </span>
                            </div>

                            {/* Connecting Tendril (Visualizing the link to current reality) */}
                            <div className="absolute top-1/2 right-full h-[1px] w-8 bg-gradient-to-r from-transparent to-violet-500/50" />
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
