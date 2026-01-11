"use client";

import { CheckCircle, ArrowRight, Clock } from "lucide-react";

export const CurrentFocusCard = () => {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between h-full relative overflow-hidden group">
            {/* Status Indicator */}
            <div className="flex justify-between items-start mb-4 relative z-10">
                <span className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    Now Focus
                </span>
                <span className="text-zinc-500 text-xs font-mono">25m REMAINING</span>
            </div>

            {/* Content */}
            <div className="relative z-10">
                <h2 className="text-2xl md:text-3xl font-semibold text-white leading-tight mb-2">
                    Review Q1 Implementation Plan
                </h2>
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>Sprint Cycle 1  •  High Priority</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-8 relative z-10">
                <button className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors">
                    <CheckCircle className="w-4 h-4" />
                    Complete
                </button>
                <button className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-colors">
                    Skip
                </button>
            </div>

            {/* Subtle Progress Bar Bottom */}
            <div className="absolute bottom-0 left-0 h-1 bg-zinc-800 w-full">
                <div className="h-full bg-rose-600/50 w-[65%]" />
            </div>
        </div>
    );
};
