"use client";

import { motion } from "framer-motion";

export const LivingBackground = () => {
    return (
        <div className="absolute inset-0 z-0 overflow-hidden bg-black pointer-events-none">
            {/* Base Deep Space */}
            <div className="absolute inset-0 bg-[#050505]" />

            {/* Slow Moving Fog/Nebula - Primary Pulse (Violet/Blue) */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.2, 0.1],
                    rotate: [0, 10, -10, 0]
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full blur-[100px] bg-indigo-900/20 mix-blend-screen"
            />

            {/* Secondary Pulse (Emerald/Teal for Life/Work) */}
            <motion.div
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.05, 0.15, 0.05],
                    x: [0, 50, 0]
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                }}
                className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full blur-[120px] bg-emerald-900/10 mix-blend-screen"
            />

            {/* The Grid - Precise Technical Layer */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Vignette for Cinematic Focus */}
            <div className="absolute inset-0 bg-radial-gradient-vignette" />
        </div>
    );
};
