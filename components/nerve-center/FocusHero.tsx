"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { PrismCard } from "./PrismCard";
import { useEncounter } from "@/components/encounter/EncounterContext";

export const FocusHero = () => {
    const { resolveEncounter } = useEncounter();

    return (
        <PrismCard intensity="HIGH" className="h-full flex flex-col justify-between p-8 relative overflow-hidden group">

            {/* Living Gradient Backdrop for Hero */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-transparent to-amber-600/20 opacity-50 group-hover:opacity-70 transition-opacity duration-1000" />

            {/* Header */}
            <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
                    <span className="text-xs font-bold tracking-[0.2em] text-white/60 uppercase">Active Pursuit</span>
                </div>
                <div className="px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md">
                    <span className="text-[10px] font-mono text-white/80">Q1 STRATEGY</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 mt-8 mb-8">
                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-5xl md:text-6xl font-light text-white tracking-tight leading-none mb-4"
                >
                    Deep Work<br />
                    <span className="text-white/40 font-thin italic">Session 1</span>
                </motion.h1>
                <p className="text-lg text-white/60 max-w-md">
                    Review Q1 implementation plans and finalize the roadmap for the Prism Dashboard.
                </p>
            </div>

            {/* Action Area */}
            <div className="relative z-10 flex items-center gap-4">
                <button
                    onClick={resolveEncounter}
                    className="bg-white text-black px-8 py-4 rounded-full font-bold text-sm tracking-wider uppercase flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform"
                >
                    Beginning Step
                    <ArrowRight className="w-4 h-4" />
                </button>
                <div className="text-xs text-white/40 font-mono">
                    EST. 45m
                </div>
            </div>

            {/* Decorative Sparkles */}
            <Sparkles className="absolute top-1/2 right-8 w-64 h-64 text-white/5 opacity-20 rotate-12 pointer-events-none" />

        </PrismCard>
    );
};
