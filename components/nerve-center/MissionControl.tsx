"use client";

import { Mic, Video, Plus, BrainCircuit } from "lucide-react";

export const MissionControl = () => {
    return (
        <div className="flex items-center gap-4 bg-zinc-900/80 backdrop-blur-md rounded-full px-4 py-2 border border-white/5 shadow-2xl">
            {/* Quick Capture (Brain) */}
            <button className="group relative p-3 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all active:scale-95">
                <BrainCircuit className="w-5 h-5" />
                <div className="absolute inset-0 rounded-full ring-1 ring-white/10 group-hover:ring-white/20" />
            </button>

            {/* Quick Add */}
            <button className="group relative p-3 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all active:scale-95">
                <Plus className="w-5 h-5" />
                <div className="absolute inset-0 rounded-full ring-1 ring-white/10 group-hover:ring-white/20" />
            </button>

            {/* DIVIDER */}
            <div className="w-px h-6 bg-white/10" />

            {/* Join Meeting (Hardware Glass) */}
            <button className="group relative px-6 py-3 rounded-full bg-black/50 overflow-hidden border border-white/10 hover:border-red-500/50 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 relative z-10">
                    <Video className="w-4 h-4 text-zinc-500 group-hover:text-red-500 transition-colors" />
                    <span className="text-sm font-medium text-zinc-500 group-hover:text-red-100 tracking-wide uppercase">Join</span>
                </div>
            </button>

            {/* Voice Intercept (Milled Aluminum) */}
            <button className="group relative p-3 rounded-full bg-gradient-to-b from-zinc-200 to-zinc-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_2px_4px_rgba(0,0,0,0.3)] active:scale-95 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] transition-all">
                <Mic className="w-5 h-5 text-zinc-900 drop-shadow-sm" />
            </button>
        </div>
    );
};
