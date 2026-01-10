"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export const TemporalPulse = () => {
    const [time, setTime] = useState<Date | null>(null);

    useEffect(() => {
        setTime(new Date());
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (!time) return <div className="h-32" />; // Avoid hydration mismatch

    const hours = time.toLocaleTimeString("en-US", { hour: "2-digit", hour12: false }).split(":")[0];
    const minutes = time.toLocaleTimeString("en-US", { minute: "2-digit" });
    const dateString = time.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

    return (
        <div className="relative flex flex-col items-center justify-center py-12 select-none">
            {/* Glow backing */}
            <div className="absolute inset-0 bg-violet-500/5 blur-[100px] rounded-full pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="relative z-10 flex items-baseline gap-2 font-bold tracking-tighter text-white/90"
                style={{ textShadow: "0 0 80px rgba(139, 92, 246, 0.3)" }}
            >
                <span className="text-8xl md:text-[10rem] leading-none font-sans bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
                    {hours}
                </span>

                <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="text-6xl md:text-8xl text-violet-400/50 -translate-y-8"
                >
                    :
                </motion.span>

                <span className="text-8xl md:text-[10rem] leading-none font-sans bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
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
