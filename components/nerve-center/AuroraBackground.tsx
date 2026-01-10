"use client";

import { motion } from "framer-motion";

export const AuroraBackground = () => {
    return (
        <div className="absolute inset-0 z-0 overflow-hidden bg-[#0a0a0f] pointer-events-none">
            {/* 
                THE AURORA MESH
                We use multiple moving blobs with mix-blend-mode to create the organic, shifting lights.
            */}

            {/* 1. Deep Violet Core (Soul) */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    x: [0, 50, 0],
                    rotate: [0, 20, 0]
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-violet-900/40 rounded-full blur-[120px] mix-blend-screen"
            />

            {/* 2. Electric Cyan (Mind) */}
            <motion.div
                animate={{
                    scale: [1, 1.1, 1],
                    y: [0, -50, 0],
                    x: [0, -30, 0]
                }}
                transition={{ duration: 30, repeat: Infinity, ease: "easeInOut", delay: 5 }}
                className="absolute top-[10%] right-[-10%] w-[60vw] h-[60vw] bg-cyan-900/30 rounded-full blur-[100px] mix-blend-screen"
            />

            {/* 3. Solar Amber (Energy) */}
            <motion.div
                animate={{
                    opacity: [0.2, 0.4, 0.2],
                    scale: [1, 1.2, 1]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 10 }}
                className="absolute bottom-[-20%] left-[20%] w-[70vw] h-[60vw] bg-amber-900/30 rounded-full blur-[130px] mix-blend-screen"
            />

            {/* 4. Rose Accent (Passion) */}
            <motion.div
                animate={{
                    x: [0, 100, 0],
                    y: [0, 50, 0]
                }}
                transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] bg-rose-900/20 rounded-full blur-[150px] mix-blend-screen"
            />

            {/* Noise Overlay for texture (Film Grain) */}
            <div className="absolute inset-0 opacity-[0.03] bg-noise" style={{ backgroundImage: 'url("/noise.png")' }} />

            {/* Vignette to focus center */}
            <div className="absolute inset-0 bg-radial-vignette" />
        </div>
    );
};
