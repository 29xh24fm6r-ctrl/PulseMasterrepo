"use client";

import { FocusSection } from "./FocusSection";
import { Inbox, List, Zap } from "lucide-react";

const INBOX_ITEMS = [
    { title: "Review Q4 Financials", context: "Finance", time: "2h ago", priority: "high" },
    { title: "Approve Design Mocks", context: "Product", time: "4h ago", priority: "normal" },
    { title: "Sync with marketing", context: "External", time: "Yesterday", priority: "normal" },
];

const TASK_ITEMS = [
    { title: "Deploy v9.0 to Prod", context: "Dev", due: "Today", energy: "High" },
    { title: "Write weekly update", context: "Ops", due: "Tomorrow", energy: "Med" },
];

export const TheDesk = () => {
    return (
        <div className="h-full overflow-y-auto px-10 py-8 scrollbar-hide">
            {/* 1. FOCUS HEAD */}
            <FocusSection />

            {/* 2. INBOX TRIAGE (Rounded Lists) */}
            <div className="mb-10">
                <div className="flex items-center justify-between mb-3 px-2">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-500/10 rounded-lg">
                            <Inbox className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <h3 className="text-xs font-bold text-zinc-400 tracking-wide uppercase">Inbox</h3>
                    </div>
                    <span className="text-[10px] font-bold text-blue-200 bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                        3
                    </span>
                </div>
                <div className="flex flex-col gap-1.5">
                    {INBOX_ITEMS.map((item, i) => (
                        <div key={i} className="group flex items-center justify-between p-3.5 rounded-xl border border-transparent bg-zinc-900/20 hover:bg-zinc-800/60 hover:border-zinc-700 hover:shadow-lg transition-all cursor-pointer">
                            <span className="text-sm text-zinc-300 font-medium group-hover:text-white transition-colors pl-1">{item.title}</span>
                            <div className="flex items-center gap-4">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${item.priority === 'high' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}>
                                    {item.context}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-600 tabular-nums group-hover:text-zinc-500 transition-colors">{item.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. CRITICAL TASKS (Cards) */}
            <div>
                <div className="flex items-center justify-between mb-3 px-2">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                            <Zap className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <h3 className="text-xs font-bold text-zinc-400 tracking-wide uppercase">Critical Actions</h3>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                    {TASK_ITEMS.map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/30 hover:bg-zinc-800/80 hover:border-emerald-500/30 hover:shadow-emerald-500/5 transition-all group cursor-pointer relative overflow-hidden">
                            {/* Hover Glow */}
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                            <div className="w-5 h-5 rounded-lg border-2 border-zinc-700 group-hover:border-emerald-500 flex items-center justify-center transition-all bg-zinc-900 hover:bg-emerald-500/10 z-10" />

                            <div className="flex-1 flex flex-col justify-center z-10">
                                <span className="text-sm text-zinc-200 font-semibold group-hover:text-white transition-colors">{item.title}</span>
                                <span className="text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors mt-0.5">{item.context} • {item.energy} Energy</span>
                            </div>

                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg uppercase tracking-wider z-10">
                                {item.due}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
