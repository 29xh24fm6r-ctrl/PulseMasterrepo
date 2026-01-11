"use client";

import { Search, Mic, Video, Plus, BrainCircuit, Bell } from "lucide-react";

export const DashboardHeader = () => {
    return (
        <header className="h-16 border-b border-zinc-800 bg-[#09090b] flex items-center px-6 justify-between shrink-0 z-50">
            {/* LEFT: Search / Command */}
            <div className="flex items-center gap-4 w-1/3">
                <div className="relative w-full max-w-md group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search Pulse (Cmd+K)..."
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:bg-zinc-900 transition-all placeholder:text-zinc-600"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-600 border border-zinc-700 rounded px-1.5 py-0.5">⌘K</div>
                </div>
            </div>

            {/* CENTER: Quick Actions (Mission Control) */}
            <div className="flex items-center gap-2">
                <button className="p-2 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors" title="Mic">
                    <Mic className="w-5 h-5" />
                </button>
                <div className="h-4 w-px bg-zinc-800 mx-1" />
                <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-red-500/50 hover:bg-zinc-800 rounded-md text-xs font-medium text-zinc-300 transition-all group">
                    <Video className="w-3.5 h-3.5 group-hover:text-red-400" />
                    Join
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800 rounded-md text-xs font-medium text-zinc-300 transition-all">
                    <BrainCircuit className="w-3.5 h-3.5" />
                    Capture
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-200 hover:bg-white text-zinc-900 rounded-md text-xs font-bold transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    Add Task
                </button>
            </div>

            {/* RIGHT: Status & User */}
            <div className="flex items-center gap-4 w-1/3 justify-end">
                <button className="text-zinc-500 hover:text-zinc-300 relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-[#09090b]" />
                </button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 border border-white/10" />
            </div>
        </header>
    );
};
