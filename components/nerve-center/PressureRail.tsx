"use client";

import { motion } from "framer-motion";

const EVENTS = [
    { time: "09:00", title: "Team Sync", status: "past" },
    { time: "10:00", title: "Deep Work", status: "past" },
    { time: "12:00", title: "Lunch", status: "active" }, // We are conceptually "here"
    { time: "13:00", title: "Client Call: Alpha", status: "approaching" }, // 15m away
    { time: "14:30", title: "Project Review", status: "future" },
    { time: "16:00", title: "Wrap Up", status: "future" },
];

export const PressureRail = () => {
    return (
        <div className="h-full w-64 flex flex-col justify-center relative overflow-hidden mask-gradient-y">
            {/* The Rail Line */}
            <div className="absolute left-[30px] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />

            {/* Events Sliding Up */}
            <div className="flex flex-col gap-24 transform translate-y-[100px]"> {/* Mocking the "sliding" offset */}

                {EVENTS.map((item, i) => {
                    const isApproaching = item.status === "approaching";
                    const isPast = item.status === "past";

                    return (
                        <div key={i} className={`flex items-center gap-6 ${isPast ? 'opacity-20 blur-[1px]' : 'opacity-100'}`}>
                            {/* Node on Rail */}
                            <div className="relative w-[60px] flex justify-center">
                                <div className={`w-2 h-2 rounded-full ${isApproaching ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' : 'bg-zinc-600'}`} />
                                {isApproaching && (
                                    <div className="absolute w-2 h-2 rounded-full bg-amber-500 animate-ping opacity-50" />
                                )}
                            </div>

                            {/* Label */}
                            <div className="flex flex-col">
                                <span className={`text-xs font-mono mb-1 ${isApproaching ? 'text-amber-500' : 'text-zinc-500'}`}>
                                    {item.time} {isApproaching && <span className="ml-2 animate-pulse">IN 15M</span>}
                                </span>
                                <span className={`text-sm font-medium tracking-tight ${isApproaching ? 'text-white' : 'text-zinc-400'}`}>
                                    {item.title}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* "NOW" Indicator Line (Fixed) */}
            <div className="absolute left-0 right-0 top-1/2 flex items-center pointer-events-none">
                <div className="w-[30px] border-b border-red-500/50" />
                <div className="ml-1 text-[10px] font-bold text-red-500 tracking-widest uppercase">Now</div>
            </div>
        </div>
    );
};
