"use client";

import { FocusSection } from "./FocusSection";
import { Inbox, list } from "lucide-react";

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
        <div className="h-full overflow-y-auto px-8 py-8 scrollbar-hide">
            {/* 1. FOCUS HEAD */}
            <FocusSection />

            {/* 2. INBOX TRIAGE */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-2">
                        <Inbox className="w-4 h-4 text-zinc-500" />
                        <h3 className="text-sm font-semibold text-zinc-300">Inbox</h3>
                    </div>
                    <span className="text-xs font-medium text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">3</span>
                </div>
                <div className="space-y-2">
                    {INBOX_ITEMS.map((item, i) => (
                        <div key={i} className="group flex items-center justify-between p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all cursor-pointer">
                            <span className="text-sm text-zinc-300 font-medium">{item.title}</span>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wide">{item.context}</span>
                                <span className="text-[10px] text-zinc-600 tabular-nums">{item.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. CRITICAL TASKS */}
            <div>
                <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-2">
                        <list className="w-4 h-4 text-zinc-500" />
                        <h3 className="text-sm font-semibold text-zinc-300">Must Do</h3>
                    </div>
                </div>
                <div className="space-y-2">
                    {TASK_ITEMS.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-transparent hover:bg-zinc-900/50 hover:border-zinc-800 transition-all group">
                            <div className="w-4 h-4 rounded border border-zinc-600 group-hover:border-zinc-400 cursor-pointer flex items-center justify-center transition-colors hover:bg-zinc-800" />
                            <div className="flex-1 flex flex-col justify-center">
                                <span className="text-sm text-zinc-300">{item.title}</span>
                                <span className="text-[10px] text-zinc-600">{item.context}</span>
                            </div>
                            <span className="text-[10px] font-medium text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded">{item.due}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
