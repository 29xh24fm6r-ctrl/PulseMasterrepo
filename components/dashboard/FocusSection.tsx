"use client";

import { CheckSquare } from "lucide-react";

export const FocusSection = () => {
    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-violet-400 rounded-full shadow-[0_0_8px_rgba(167,139,250,0.8)] animate-pulse" />
                    <h3 className="text-[11px] font-bold text-violet-300 uppercase tracking-widest font-mono">Current Protocol</h3>
                </div>
                <span className="text-[10px] font-mono text-violet-300/60 tabular-nums">T-MINUS 00:24:15</span>
            </div>

            {/* VIBRANT GLASS CARD (rounded-2xl) */}
            <div className="group relative bg-zinc-900/40 backdrop-blur-xl border border-violet-500/20 rounded-2xl p-6 hover:bg-zinc-900/50 hover:border-violet-500/30 transition-all shadow-2xl overflow-hidden">

                {/* Ambient Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 blur-[80px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />

                {/* Active Indicator Line (Gradient) */}
                <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-gradient-to-b from-violet-500 via-fuchsia-500 to-transparent opacity-80" />

                <div className="flex items-start justify-between relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-300 border border-violet-500/20 uppercase tracking-wider font-mono shadow-[0_0_10px_rgba(139,92,246,0.1)]">
                                Deep Work
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800/50 text-zinc-400 border border-white/5 uppercase tracking-wide">
                                STR-2024
                            </span>
                        </div>
                        <h2 className="text-3xl font-bold text-white tracking-tight mb-2 leading-tight drop-shadow-lg">
                            Q1 Strategy Review
                        </h2>
                        <p className="text-sm text-zinc-400 font-medium leading-relaxed max-w-xl">
                            Review OKRs and finalize the technical roadmap for the core engineering team.
                        </p>
                    </div>

                    <button className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:text-white hover:bg-violet-500 hover:border-violet-400 transition-all active:scale-95 shadow-lg group-hover:shadow-violet-500/20">
                        <CheckSquare className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress Bar (Integrated) */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 w-[65%] shadow-[0_0_15px_rgba(168,85,247,0.6)]" />
                </div>
            </div>
        </div>
    );
};
