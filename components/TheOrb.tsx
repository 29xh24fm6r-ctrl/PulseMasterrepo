
"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type OrbState = "idle" | "listening" | "thinking" | "speaking";

interface OrbProps {
    state?: OrbState;
    className?: string;
}

export function TheOrb({ state = "idle", className = "" }: OrbProps) {
    // We'll hook this up to real state later. For now, it breathes.

    const variants: any = {
        idle: {
            scale: [1, 1.1, 1],
            opacity: [0.6, 0.8, 0.6],
            filter: "blur(40px)",
            transition: { duration: 6, repeat: Infinity, ease: "easeInOut" }
        },
        listening: {
            scale: [1.2, 1.3, 1.2],
            opacity: 0.9,
            filter: "blur(30px)",
            background: "radial-gradient(circle, rgba(50,255,100,0.8), rgba(0,0,0,0))",
            transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        },
        thinking: {
            rotate: [0, 360],
            scale: 1.1,
            opacity: 0.9,
            filter: "blur(20px)",
            background: "conic-gradient(from 0deg, #3b82f6, #8b5cf6, #3b82f6)",
            transition: { duration: 2, repeat: Infinity, ease: "linear" }
        }
    };

    return (
        <div className={`pointer-events-none fixed inset-0 flex items-center justify-center -z-10 overflow-hidden ${className}`}>
            {/* Core Orb */}
            <motion.div
                initial="idle"
                animate={state}
                variants={variants}
                className="w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 blur-3xl opacity-50 absolute"
            />

            {/* Secondary Glow Layer */}
            <motion.div
                animate={{
                    scale: [1.1, 1.2, 1.1],
                    opacity: [0.3, 0.5, 0.3]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full bg-blue-900/30 blur-3xl absolute mix-blend-screen"
            />
        </div>
    );
}
