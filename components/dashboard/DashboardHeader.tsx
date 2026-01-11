"use client";

import { Search, Mic, Video, Plus, BrainCircuit, Bell } from "lucide-react";

export const DashboardHeader = () => {
    return (
        <header className="h-16 border-b border-white/5 bg-black/20 backdrop-blur-xl flex items-center px-6 justify-between shrink-0 z-50 sticky top-0">
            {/* LEFT: Search / Command */}
            <div className="flex items-center gap-4 w-1/3">
                <div className="relative w-full max-w-md group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search Pulse..."
                        className="w-full bg-zinc-900/50 border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-200 font-medium focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:bg-zinc-900/80 transition-all placeholder:text-zinc-600"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-600 border border-white/5 rounded-md px-1.5 py-0.5 bg-white/5">⌘K</div>
                </div>
            </div>

            {/* CENTER: Quick Actions (Vibrant Glass) */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900/40 border border-white/5 backdrop-blur-md">
                <button className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-red-400 transition-colors active:scale-95" title="Mic">
                    <Mic className="w-4 h-4" />
                </button>
                <div className="h-4 w-px bg-white/5 mx-1" />

                <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800/50 rounded-lg text-xs font-semibold text-zinc-300 transition-all group active:scale-95">
                    <Video className="w-3.5 h-3.5 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                    Join
                </button>

                <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800/50 rounded-lg text-xs font-semibold text-zinc-300 transition-all group active:scale-95">
                    <BrainCircuit className="w-3.5 h-3.5 text-zinc-500 group-hover:text-violet-400 transition-colors" />
                    Capture
                </button>

                <button className="flex items-center gap-2 px-3 py-1.5 bg-white text-black hover:bg-zinc-200 rounded-lg text-xs font-bold transition-all shadow-lg shadow-white/5 active:scale-95 ml-1">
                    <Plus className="w-3.5 h-3.5" />
                    Add
                </button>
            </div>

            {/* RIGHT: Status & User */}
            <div className="flex items-center gap-6 w-1/3 justify-end">
                <button className="text-zinc-500 hover:text-zinc-300 relative transition-colors p-2 hover:bg-white/5 rounded-full">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-black" />
                </button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 border-2 border-white/10 shadow-lg" />
            </div>
        </header>
    );
};
