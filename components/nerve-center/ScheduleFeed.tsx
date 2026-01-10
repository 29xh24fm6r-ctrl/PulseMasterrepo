"use client";

import { Clock, ArrowRight } from "lucide-react";

interface ScheduleFeedProps {
    status: "FREE" | "BUSY" | "FOCUS";
    currentEvent?: {
        name: string;
        endsIn: string; // e.g., "12m"
    };
    nextEvent?: {
        name: string;
        time: string; // e.g., "14:00"
    };
    freeUntil?: string; // e.g., "14:00"
}

export const ScheduleFeed = ({ status, currentEvent, nextEvent, freeUntil }: ScheduleFeedProps) => {
    return (
        <div className="flex flex-col gap-6 font-mono">
            {/* Primary Status */}
            <div className={`text-4xl md:text-5xl font-light tracking-tight ${status === "FREE" ? "text-emerald-400" :
                    status === "FOCUS" ? "text-violet-400" :
                        "text-zinc-200"
                }`}>
                {status === "FREE" && `Free until ${freeUntil}`}
                {status === "BUSY" && "Engaged"}
                {status === "FOCUS" && "Deep Work"}
            </div>

            {/* Detailed Feed */}
            <div className="flex flex-col gap-4 border-l-2 border-zinc-800 pl-6 py-2">

                {currentEvent && (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider">
                            <Clock className="w-3 h-3" />
                            <span>Current</span>
                        </div>
                        <div className="text-xl text-white">{currentEvent.name}</div>
                        <div className="text-amber-500 text-sm">Ends in {currentEvent.endsIn}</div>
                    </div>
                )}

                {nextEvent && (
                    <div className={`flex flex-col gap-1 ${currentEvent ? "mt-4 opacity-50" : ""}`}>
                        <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-wider">
                            <ArrowRight className="w-3 h-3" />
                            <span>Next</span>
                        </div>
                        <div className="text-lg text-zinc-300">{nextEvent.name}</div>
                        <div className="text-zinc-500 text-sm">at {nextEvent.time}</div>
                    </div>
                )}
            </div>
        </div>
    );
};
