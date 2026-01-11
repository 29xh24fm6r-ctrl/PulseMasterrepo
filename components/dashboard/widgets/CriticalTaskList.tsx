"use client";

import { CheckSquare, AlertCircle } from "lucide-react";

export const CriticalTaskList = () => {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col h-full">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    Must Do Today
                </h3>
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">3 Items</span>
            </div>

            <div className="flex-1 p-2">
                {[
                    "Send Invoice #304",
                    "Reply to Sarah's Email",
                    "Update Q1 Metrics"
                ].map((task, i) => (
                    <div key={i} className="group flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer">
                        <button className="mt-0.5 w-5 h-5 rounded border border-zinc-600 group-hover:border-rose-500 flex items-center justify-center text-transparent hover:text-rose-500 transition-all">
                            <CheckSquare className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm text-zinc-300 group-hover:text-white">{task}</span>
                    </div>
                ))}
            </div>
            <button className="w-full py-3 text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30 transition-colors border-t border-zinc-800">
                + Quick Add Task
            </button>
        </div>
    );
};
