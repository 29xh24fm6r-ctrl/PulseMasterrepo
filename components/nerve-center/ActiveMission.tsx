"use client";

import { motion } from "framer-motion";
import { Play, ArrowRight, Target } from "lucide-react";

interface ActiveMissionProps {
    title: string;
    subtitle: string;
    onEngage: () => void;
    type: "FOCUS" | "EVENT" | "FREE";
}

export const ActiveMission = ({ title, subtitle, onEngage, type }: ActiveMissionProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="relative group perspective-1000"
        >
            {/* Holographic Glow Container */}
            <div className="relative w-full max-w-lg mx-auto p-[1px] rounded-2xl bg-gradient-to-b from-white/10 to-white/0 overflow-hidden">

                {/* The Glass Card */}
                <div className="relative bg-black/40 backdrop-blur-2xl px-12 py-16 rounded-2xl border border-white/5 flex flex-col items-center text-center shadow-2xl">

                    {/* Living Status Ring */}
                    <div className="mb-8 relative">
                        <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className={`absolute inset-0 rounded-full ${type === "FOCUS" ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                        />
                        <div className={`relative z-10 w-3 h-3 rounded-full ${type === "FOCUS" ? "bg-amber-500 box-shadow-amber" : "bg-emerald-500 box-shadow-emerald"
                            }`} />
                    </div>

                    {/* Mission Data */}
                    <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-white/40 mb-3">
                        {type === "FOCUS" ? "High Priority Mission" : "Current Status"}
                    </h2>
                    <h1 className="text-4xl md:text-5xl font-light text-white tracking-tight mb-4 leading-tight">
                        {title}
                    </h1>
                    <p className="text-lg text-white/60 font-light mb-10 max-w-sm leading-relaxed">
                        {subtitle}
                    </p>

                    {/* The Trigger */}
                    <button
                        onClick={onEngage}
                        className="group/btn relative px-10 py-4 bg-white hover:bg-zinc-200 text-black text-sm font-bold tracking-[0.2em] uppercase rounded-full transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                    >
                        <span>Engage</span>
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />

                        {/* Internal Glow */}
                        <div className="absolute inset-0 rounded-full bg-white/20 blur-md opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                    </button>

                </div>

                {/* Scanline Effect overlay */}
                <div className="absolute inset-0 bg-scanline pointer-events-none opacity-[0.03]" />
            </div>

            {/* Floor Reflection (Fake) */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-[80%] h-4 bg-white/5 blur-xl rounded-full opacity-30" />
        </motion.div>
    );
};
