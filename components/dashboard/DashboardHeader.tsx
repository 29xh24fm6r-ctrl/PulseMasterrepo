"use client";

import { Search, Mic, Video, Plus, BrainCircuit, Bell } from "lucide-react";

export const DashboardHeader = () => {
    return (
        <header className="h-16 border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl flex items-center px-6 justify-between shrink-0 z-50 sticky top-0">
            {/* LEFT: Search / Command */}
            <div className="flex items-center gap-4 w-1/3">
                <div className="relative w-full max-w-md group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search Pulse..."
                        className="w-full bg-black/40 border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] rounded-lg pl-9 pr-4 py-1.5 text-sm text-zinc-300 font-medium focus:outline-none focus:ring-1 focus:ring-white/10 focus:bg-black/60 transition-all placeholder:text-zinc-700 font-mono tracking-tight"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono text-zinc-600 border border-white/5 rounded px-1.5 py-0.5 bg-white/5">⌘K</div>
                </div>
            </div>

            {/* CENTER: Quick Actions (Mission Control - Milled Aluminum) */}
            <div className="flex items-center gap-2 p-1 rounded-lg bg-zinc-900/50 border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <button className="p-1.5 rounded-md hover:bg-white/5 text-zinc-500 hover:text-red-400 transition-colors active:scale-95" title="Mic">
                    <Mic className="w-4 h-4" />
                </button>
                <div className="h-3 w-px bg-white/5 mx-1" />

                <button className="flex items-center gap-2 px-3 py-1 bg-gradient-to-b from-zinc-800 to-zinc-900 border border-white/5 shadow-[0_1px_0_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] hover:from-zinc-700 hover:to-zinc-800 rounded text-[11px] font-medium text-zinc-300 transition-all group active:translate-y-[1px]">
                    <Video className="w-3 h-3 text-zinc-500 group-hover:text-red-400 transition-colors" />
                    JOIN
                </button>

                <button className="flex items-center gap-2 px-3 py-1 bg-gradient-to-b from-zinc-800 to-zinc-900 border border-white/5 shadow-[0_1px_0_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] hover:from-zinc-700 hover:to-zinc-800 rounded text-[11px] font-medium text-zinc-300 transition-all active:translate-y-[1px]">
                    <BrainCircuit className="w-3 h-3 text-zinc-500" />
                    CAPTURE
                </button>

                <button className="flex items-center gap-2 px-3 py-1 bg-gradient-to-b from-zinc-100 to-zinc-300 border border-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.5)] hover:from-white hover:to-zinc-200 rounded text-[11px] font-bold text-zinc-900 transition-all active:translate-y-[1px]">
                    <Plus className="w-3 h-3" />
                    ADD
                </button>
            </div>

            {/* RIGHT: Status & User */}
            <div className="flex items-center gap-6 w-1/3 justify-end">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 border border-white/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] font-mono text-zinc-500 tracking-wide uppercase">Online</span>
                    </div>
                </div>
                <button className="text-zinc-600 hover:text-zinc-300 relative transition-colors">
                    <Bell className="w-4 h-4" />
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-black" />
                </button>
                <div className="w-7 h-7 rounded bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 border border-white/10 shadow-inner" />
            </div>
        </header>
    );
};
