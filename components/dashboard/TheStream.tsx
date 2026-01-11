"use client";

import { Calendar, Phone, Signal } from "lucide-react";

export const TheStream = () => {
    return (
        <div className="h-full border-l border-zinc-800 bg-[#09090b]/50 p-6 flex flex-col gap-8 overflow-y-auto scrollbar-hide">

            {/* 1. SCHEDULE WIDGET */}
            <div>
                <div className="flex items-center gap-2 mb-4 text-zinc-500">
                    <Calendar className="w-4 h-4" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Schedule</h3>
                </div>

                <div className="space-y-6 relative">
                    {/* The Rail Line */}
                    <div className="absolute left-[7px] top-2 bottom-0 w-px bg-zinc-800" />

                    {/* Events */}
                    <div className="relative pl-6">
                        <div className="absolute left-0 top-[6px] w-3.5 h-3.5 bg-zinc-900 border-2 border-zinc-600 rounded-full z-10" />
                        <span className="block text-xs font-mono text-zinc-500 mb-0.5">09:00</span>
                        <span className="text-sm text-zinc-500 line-through decoration-zinc-700">Team Sync</span>
                    </div>

                    <div className="relative pl-6">
                        <div className="absolute left-0 top-[6px] w-3.5 h-3.5 bg-amber-500 border-2 border-[#09090b] shadow-[0_0_8px_rgba(245,158,11,0.5)] rounded-full z-10" />
                        <span className="block text-xs font-mono text-amber-500 mb-0.5">NOW</span>
                        <span className="text-sm font-medium text-white">Strategy Review</span>
                        <span className="block text-[10px] text-zinc-500 mt-1">1h • Deep Work</span>
                    </div>

                    <div className="relative pl-6 opacity-80">
                        <div className="absolute left-0 top-[6px] w-3.5 h-3.5 bg-zinc-800 border-2 border-zinc-600 rounded-full z-10" />
                        <span className="block text-xs font-mono text-zinc-400 mb-0.5">13:00</span>
                        <span className="text-sm text-zinc-300">Client Call: Alpha</span>
                    </div>

                    <div className="relative pl-6 opacity-50">
                        <div className="absolute left-0 top-[6px] w-3.5 h-3.5 bg-zinc-800 border-2 border-zinc-700 rounded-full z-10" />
                        <span className="block text-xs font-mono text-zinc-500 mb-0.5">16:00</span>
                        <span className="text-sm text-zinc-500">Wrap Up</span>
                    </div>
                </div>
            </div>

            {/* 2. SIGNALS / PEOPLE */}
            <div className="mt-auto">
                <div className="flex items-center gap-2 mb-4 text-zinc-500">
                    <Signal className="w-4 h-4" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Signals</h3>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">A</div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-red-400">Missed Call</span>
                                <span className="text-[10px] text-red-400/70">Alex K. • 10m ago</span>
                            </div>
                        </div>
                        <Phone className="w-4 h-4 text-red-500" />
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">M</div>
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-zinc-300">Maria S.</span>
                                <span className="text-[10px] text-zinc-500">Sent a file • 1h ago</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};
