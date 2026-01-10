"use client";

import { motion } from "framer-motion";
import { Activity, Zap, Play, AlertTriangle, Battery } from "lucide-react";
import { GlassCard } from "@/components/ui/premium/GlassCard";
import { useEncounter } from "@/components/encounter/EncounterContext";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
};

export const CommandCenter = () => {
    const { state } = useEncounter();

    // V2.0 PHILOSOPHY: ALWAYS ON.
    // The Cockpit never goes dark. It is the control surface.
    // We remove the 'if (state === CLEAR) return null' logic.

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col items-center w-full max-w-4xl mx-auto px-4 mt-8 space-y-8"
        >
            {/* 1. THE MONITOR (System Status) */}
            {/* "The Check Engine Light for the Human" */}
            <motion.div variants={item} className="grid grid-cols-3 gap-4 w-full max-w-2xl">
                {/* CAPACITY */}
                <GlassCard className="p-4 flex flex-col items-center justify-center border-white/5 bg-zinc-900/40">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Capacity</div>
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-violet-400" />
                        <span className="text-sm font-medium text-zinc-200">GOOD</span>
                    </div>
                </GlassCard>

                {/* LOAD */}
                <GlassCard className="p-4 flex flex-col items-center justify-center border-white/5 bg-zinc-900/40">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Load</div>
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-medium text-zinc-200">OPTIMAL</span>
                    </div>
                </GlassCard>

                {/* BODY */}
                <GlassCard className="p-4 flex flex-col items-center justify-center border-white/5 bg-zinc-900/40">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Body</div>
                    <div className="flex items-center gap-2">
                        <Battery className="w-4 h-4 text-zinc-400" />
                        <span className="text-sm font-medium text-zinc-200">READY</span>
                    </div>
                </GlassCard>
            </motion.div>

            {/* 2. THE STICK (Command Layer) */}
            {/* "The Act of Will" - Single Dominant Action */}
            <motion.div variants={item} className="w-full flex justify-center py-6">
                <button
                    className="group relative flex items-center justify-center gap-4 px-12 py-6 
                               bg-zinc-100 hover:bg-white text-zinc-950 rounded-full 
                               transition-all duration-300 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]
                               hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.5)] hover:scale-[1.02] active:scale-[0.98]"
                >
                    <div className="flex flex-col items-start">
                        <span className="text-xs font-bold tracking-[0.2em] opacity-40 uppercase">Command</span>
                        <span className="text-xl font-bold tracking-tight">ENGAGE FLOW</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-zinc-950 text-white flex items-center justify-center group-hover:bg-violet-600 transition-colors">
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                    </div>
                </button>
            </motion.div>

            {/* 3. THE RADAR (Situational Awareness) */}
            {/* "Heads-Up Feed" - Hard Lines & Soft Lines */}
            <motion.div variants={item} className="w-full max-w-2xl">
                <div className="flex flex-col space-y-2">
                    {/* Header */}
                    <div className="flex justify-between items-end px-2 mb-2">
                        <div className="text-[10px] uppercase tracking-widest text-zinc-600">Radar Contact</div>
                    </div>

                    {/* Timeline Item: The Hard Line (Next Meeting) */}
                    <div className="w-full h-14 border border-zinc-800 bg-zinc-900/30 rounded-lg flex items-center px-6 justify-between opacity-50 grayscale">
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-mono text-zinc-500">14:00</span>
                            <div className="h-4 w-[1px] bg-zinc-800" />
                            <span className="text-sm text-zinc-500">Strategy Sync</span>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider text-zinc-600">Complete</span>
                    </div>

                    {/* Timeline Item: The Soft Line (Current Window) */}
                    <div className="w-full h-20 border-l-2 border-l-violet-500 bg-gradient-to-r from-violet-500/5 to-transparent rounded-r-lg flex items-center px-6 justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-mono text-violet-400">NOW</span>
                            <div className="h-4 w-[1px] bg-violet-500/30" />
                            <div>
                                <div className="text-sm font-medium text-white">Open Window</div>
                                <div className="text-xs text-zinc-500">Deep Work Opportunity</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-light text-zinc-300">45m</div>
                            <div className="text-[10px] uppercase tracking-wider text-zinc-600">Remaining</div>
                        </div>
                    </div>

                    {/* Timeline Item: The Inbound (Future) */}
                    <div className="w-full h-14 border border-zinc-800/50 bg-zinc-900/20 rounded-lg flex items-center px-6 justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-mono text-zinc-500">17:30</span>
                            <div className="h-4 w-[1px] bg-zinc-800" />
                            <span className="text-sm text-zinc-400">Wrap Up</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
