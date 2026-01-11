"use client";

import { Play, CheckSquare, Clock } from "lucide-react";

export const FocusSection = () => {
    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Current Focus</h3>
                <span className="text-xs font-mono text-zinc-600">00:24:15</span>
            </div>

            <div className="group relative bg-[#09090b] border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors shadow-sm">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-xl" />

                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wide">
                                Deep Work
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                                #strategy
                            </span>
                        </div>
                        <h2 className="text-xl font-semibold text-white tracking-tight mb-1">
                            Q1 Strategy Review
                        </h2>
                        <p className="text-sm text-zinc-500 line-clamp-1">
                            Review OKRs and finalize the roadmap for the engineering team.
                        </p>
                    </div>

                    <button className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-green-400 hover:border-green-500/50 transition-all active:scale-95">
                        <CheckSquare className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress Bar (Subtle) */}
                <div className="absolute bottom-0 left-1 right-0 h-0.5 bg-zinc-800 overflow-hidden rounded-br-xl">
                    <div className="h-full bg-amber-500 w-[65%]" />
                </div>
            </div>
        </div>
    );
};
