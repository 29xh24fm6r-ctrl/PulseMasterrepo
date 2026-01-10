"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useAnimation, useMotionValue, useSpring, useTransform } from "framer-motion";

export const LivingAtmosphere = () => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Smooth mouse movement
    const springConfig = { damping: 25, stiffness: 70 };
    const smoothX = useSpring(mouseX, springConfig);
    const smoothY = useSpring(mouseY, springConfig);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX, mouseY]);

    return (
        <div className="fixed inset-0 z-0 overflow-hidden bg-black pointer-events-none">
            {/* 1. Deep Space Base */}
            <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-slate-950" />

            {/* 2. Ambient Aurora (Breathing) */}
            <motion.div
                animate={{
                    opacity: [0.3, 0.5, 0.3],
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-violet-900/10 blur-[120px] mix-blend-screen"
            />

            <motion.div
                animate={{
                    opacity: [0.2, 0.4, 0.2],
                    scale: [1.1, 1, 1.1],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                }}
                className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-indigo-900/10 blur-[100px] mix-blend-screen"
            />

            {/* 3. Interactive Neural Mesh (Parallax) */}
            <motion.div
                style={{ x: useTransform(smoothX, (value) => (value - window.innerWidth / 2) / 50), y: useTransform(smoothY, (value) => (value - window.innerHeight / 2) / 50) }}
                className="absolute inset-0"
            >
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[80px]" />
                <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-fuchsia-500/5 rounded-full blur-[60px]" />
            </motion.div>

            {/* 4. Cinematics: Dust Motes / Stars */}
            <div className="absolute inset-0 opacity-20 bg-[url('/noise.png')] mix-blend-overlay" />

            {/* 5. Vignette for Focus */}
            <div className="absolute inset-0 bg-radial-gradient-c from-transparent via-transparent to-black/80" />
        </div>
    );
};
