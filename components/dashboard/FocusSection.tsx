"use client";

import { Play, CheckSquare, Clock } from "lucide-react";

export const FocusSection = () => {
    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Current Protocol</h3>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 tabular-nums">T-MINUS 00:24:15</span>
            </div>

            <div className="group relative bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-lg p-6 hover:bg-zinc-900/40 hover:border-white/10 transition-all shadow-2xl">
                {/* Active Indicator Line */}
                <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-gradient-to-b from-amber-500 to-transparent rounded-l-lg opacity-80" />

                <div className="flex items-start justify-between relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider font-mono shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                                Deep Work
                            </span>
                            <span className="px-1.5 py-0.5 rounded-[4px] text-[9px] font-mono bg-zinc-800/50 text-zinc-500 border border-white/5 uppercase tracking-wide">
                                STR-2024
                            </span>
                        </div>
                        <h2 className="text-2xl font-semibold text-white tracking-tight mb-2 leading-tight">
                            Q1 Strategy Review
                        </h2>
                        <p className="text-sm text-zinc-500 font-medium leading-relaxed max-w-xl">
                            Review OKRs and finalize the technical roadmap for the core engineering team.
                        </p>
                    </div>

                    <button className="flex items-center justify-center w-8 h-8 rounded bg-zinc-800/50 border border-white/5 text-zinc-600 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-all active:scale-95 shadow-lg">
                        <CheckSquare className="w-4 h-4" />
                    </button>
                </div>

                {/* Progress Bar (Integrated) */}
                <div className="absolute bottom-0 left-[2px] right-0 h-[1px] bg-white/5">
                    <div className="h-full bg-amber-500 w-[65%] shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                </div>
            </div>
        </div>
    );
};
