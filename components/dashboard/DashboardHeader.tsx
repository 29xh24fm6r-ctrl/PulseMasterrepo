"use client";

import { Search, Mic, Video, Plus, BrainCircuit, Bell } from "lucide-react";

export const DashboardHeader = () => {
    return (
        <header className="h-14 border-b border-white/5 bg-black/10 backdrop-blur-2xl saturate-150 flex items-center px-6 justify-between shrink-0 z-40 sticky top-0 transition-all">
            {/* LEFT: Search / Command */}
            <div className="flex items-center gap-4 w-1/3">
                <div className="relative w-full max-w-sm group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search Pulse..."
                        className="w-full bg-white/5 border border-white/5 shadow-inner rounded-lg pl-10 pr-4 py-1.5 text-sm text-zinc-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:bg-white/10 transition-all placeholder:text-zinc-600"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-600 border border-white/5 rounded px-1.5 py-0.5 bg-white/5">⌘K</div>
                </div>
            </div>

            {/* CENTER: Quick Actions (Mac Toolbar Style) */}
            <div className="flex items-center gap-1">
                <button className="p-2 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors flex flex-col items-center gap-0.5 active:scale-95 group">
                    <Mic className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />

                <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-md text-xs font-medium text-zinc-300 transition-all active:scale-95">
                    <Video className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Join</span>
                </button>

                <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-md text-xs font-medium text-zinc-300 transition-all active:scale-95">
                    <BrainCircuit className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Capture</span>
                </button>

                <div className="w-px h-4 bg-white/10 mx-1" />

                <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium shadow-sm transition-all active:scale-95">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Task</span>
                </button>
            </div>

            {/* RIGHT: Status & User */}
            <div className="flex items-center gap-4 w-1/3 justify-end">
                <button className="text-zinc-500 hover:text-zinc-300 relative transition-colors p-1.5 hover:bg-white/5 rounded-md">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-black" />
                </button>
            </div>
        </header>
    );
};
