"use client";

import { LayoutGrid, Activity, CheckCircle2, MessageSquare, Network, Settings } from "lucide-react";

export const RightRail = () => {
    return (
        <div className="flex flex-col items-center py-6 gap-8 border-l border-white/10 h-full bg-black/40">
            {/* Primary Mode Switchers */}
            <div className="flex flex-col gap-6">
                <RailItem icon={LayoutGrid} active={false} />
                <RailItem icon={Activity} active={false} label="Vital" alert />
                <RailItem icon={CheckCircle2} active={true} label="Tasks" />
                <RailItem icon={MessageSquare} active={false} label="Comms" />
                <RailItem icon={Network} active={false} label="Graph" />
            </div>

            <div className="mt-auto">
                <RailItem icon={Settings} active={false} />
            </div>
        </div>
    );
};

function RailItem({ icon: Icon, active, label, alert }: { icon: any, active: boolean, label?: string, alert?: boolean }) {
    return (
        <button className="group relative flex items-center justify-center w-10 h-10">
            {active && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-500 rounded-l-sm shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            )}

            <Icon className={`w-5 h-5 transition-colors ${active ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'}`} />

            {alert && (
                <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full" />
            )}
        </button>
    );
}
