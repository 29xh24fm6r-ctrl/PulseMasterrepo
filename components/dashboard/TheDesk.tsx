"use client";

import { FocusSection } from "./FocusSection";
import { Inbox, List } from "lucide-react";

const INBOX_ITEMS = [
    { title: "Review Q4 Financials", context: "Finance", time: "2h ago" },
    { title: "Approve Design Mocks", context: "Product", time: "4h ago" },
    { title: "Sync with marketing", context: "External", time: "Yesterday" },
];

const TASK_ITEMS = [
    { title: "Deploy v9.0 to Prod", context: "Dev", due: "Today" },
    { title: "Write weekly update", context: "Ops", due: "Tomorrow" },
];

export const TheDesk = () => {
    return (
        <div className="h-full overflow-y-auto px-10 py-8 scrollbar-hide">
            {/* 1. FOCUS HEAD */}
            <FocusSection />

            {/* 2. INBOX TRIAGE */}
            <div className="mb-10">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                        <Inbox className="w-3.5 h-3.5 text-zinc-500" />
                        <h3 className="text-xs font-semibold text-zinc-400 tracking-wide uppercase">Inbox</h3>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-white/5">
                        3
                    </span>
                </div>
                <div className="flex flex-col gap-1">
                    {INBOX_ITEMS.map((item, i) => (
                        <div key={i} className="group flex items-center justify-between p-3 rounded-md border border-transparent hover:bg-zinc-900 hover:border-white/5 hover:shadow-lg transition-all cursor-pointer">
                            <span className="text-sm text-zinc-300 font-medium group-hover:text-white transition-colors">{item.title}</span>
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider group-hover:text-zinc-500 transition-colors">{item.context}</span>
                                <span className="text-[10px] font-mono text-zinc-700 tabular-nums group-hover:text-zinc-500 transition-colors">{item.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. CRITICAL TASKS */}
            <div>
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                        <List className="w-3.5 h-3.5 text-zinc-500" />
                        <h3 className="text-xs font-semibold text-zinc-400 tracking-wide uppercase">Critical Actions</h3>
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    {TASK_ITEMS.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-md border border-transparent hover:bg-zinc-900 hover:border-white/5 hover:shadow-lg transition-all group cursor-pointer">
                            <div className="w-3.5 h-3.5 rounded-[3px] border border-zinc-700 group-hover:border-zinc-500 flex items-center justify-center transition-all bg-zinc-900/50 hover:bg-zinc-800" />
                            <div className="flex-1 flex flex-col justify-center">
                                <span className="text-sm text-zinc-300 font-medium group-hover:text-white transition-colors">{item.title}</span>
                                <span className="text-[10px] text-zinc-600 group-hover:text-zinc-500 transition-colors">{item.context}</span>
                            </div>
                            <span className="text-[9px] font-mono font-bold text-amber-500/80 bg-amber-500/5 border border-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider group-hover:bg-amber-500/10 transition-colors">{item.due}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
