"use client";

import { Clock, MoreHorizontal, Calendar, Video } from "lucide-react";

// Mock Data for Schedule
const SCHEDULE_ITEMS = [
    { time: "09:00", title: "Deep Work Block", type: "focus", duration: "2h" },
    { time: "11:30", title: "Team Sync", type: "meeting", duration: "30m" },
    { time: "14:00", title: "Product Review", type: "meeting", duration: "1h" },
];

export const TheStream = () => {
    return (
        <div className="h-full px-6 py-8 overflow-y-auto scrollbar-hide flex flex-col gap-6">

            {/* 1. PEOPLE / RELATIOSHIP PULSE (Ported from CRM) */}
            <div className="rounded-2xl border border-zinc-800 p-5 bg-zinc-900/60 backdrop-blur-xl shadow-lg hover:border-cyan-500/30 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
                            <div className="font-semibold text-zinc-100 text-sm tracking-tight">
                                Relationship Pulse
                            </div>
                        </div>
                        <div className="mt-1.5 text-xs text-zinc-400 font-medium leading-relaxed">
                            <span className="text-cyan-400 font-semibold">Sarah Connor</span> completed the follow-up "Discuss Q4 roadmap".
                        </div>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        10:42 AM
                    </div>
                </div>

                {/* Progress Bar Aesthetic */}
                <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full bg-cyan-500 w-[85%] shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                </div>
            </div>


            {/* 2. SCHEDULE RAIL */}
            <div>
                <div className="flex items-center gap-2 mb-4 px-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-mono">Future Stream</h3>
                </div>

                <div className="space-y-3">
                    {SCHEDULE_ITEMS.map((item, i) => (
                        <div key={i} className="flex gap-4 group cursor-pointer">
                            {/* Time Column */}
                            <div className="w-12 text-right shrink-0">
                                <span className="text-xs font-mono font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">{item.time}</span>
                            </div>

                            {/* Timeline Line */}
                            <div className="relative flex flex-col items-center">
                                <div className={`w-2.5 h-2.5 rounded-full border-2 z-10 bg-zinc-950 ${item.type === 'focus' ? 'border-violet-500 group-hover:bg-violet-500' : 'border-zinc-700 group-hover:border-zinc-500'}`} />
                                <div className="w-[1px] bg-zinc-800 h-full absolute top-2.5 -bottom-4 group-last:hidden" />
                            </div>

                            {/* Content Card */}
                            <div className={`flex-1 p-3 rounded-xl border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm -mt-2 mb-1 group-hover:bg-zinc-800/40 group-hover:border-zinc-700 transition-all ${item.type === 'focus' ? 'border-l-[3px] border-l-violet-500' : ''}`}>
                                <h4 className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{item.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-zinc-500 font-mono">{item.duration}</span>
                                    {item.type === 'meeting' && <Video className="w-3 h-3 text-zinc-600" />}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. CONTEXT WIDGET (Glass Pill) */}
            <div className="mt-auto rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-950 p-4 relative overflow-hidden group hover:border-pink-500/20 transition-all">
                <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 blur-[40px] rounded-full pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <div className="text-pink-400 text-xs font-bold uppercase tracking-wider mb-1">Upcoming</div>
                        <div className="text-zinc-300 font-medium text-sm">Tomorrow's Weekly Review</div>
                    </div>
                    <Calendar className="w-4 h-4 text-zinc-600" />
                </div>
            </div>

        </div>
    );
};
