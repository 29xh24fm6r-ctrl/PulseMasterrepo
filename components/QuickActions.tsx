"use client";

import Link from "next/link";
import {
    Zap,
    CheckCircle,
    PenTool,
    Calendar,
    Plus,
    Search
} from "lucide-react";

const ACTIONS = [
    { label: "New Task", icon: CheckCircle, href: "/tasks/new", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Journal", icon: PenTool, href: "/journal/new", color: "text-pink-400", bg: "bg-pink-500/10" },
    { label: "Quick Note", icon: Zap, href: "/capture", color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Schedule", icon: Calendar, href: "/plannner", color: "text-blue-400", bg: "bg-blue-500/10" },
];

export function QuickActions() {
    return (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                Quick Actions
            </h2>

            <div className="grid grid-cols-2 gap-3">
                {ACTIONS.map((action) => (
                    <Link
                        key={action.label}
                        href={action.href}
                        className="group flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all hover:scale-[1.02]"
                    >
                        <div className={`p-3 rounded-full mb-2 ${action.bg} ${action.color}`}>
                            <action.icon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
                            {action.label}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
