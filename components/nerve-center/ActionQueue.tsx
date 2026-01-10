"use client";

import { AlertCircle } from "lucide-react";

interface ActionItem {
    id: string;
    task: string;
    blocker: string; // e.g., "Not Sent", "Overdue"
    isCritical: boolean;
}

interface ActionQueueProps {
    items: ActionItem[];
}

export const ActionQueue = ({ items }: ActionQueueProps) => {
    if (items.length === 0) {
        return <div className="text-zinc-600 text-sm italic">Operational capacity nominal.</div>;
    }

    return (
        <div className="flex flex-col gap-3">
            {items.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-zinc-900/40 border border-zinc-800 rounded-md">
                    {item.isCritical && (
                        <AlertCircle className="w-4 h-4 text-red-500 mt-1 shrink-0" />
                    )}
                    <div className="flex-1">
                        <div className="text-zinc-200 text-sm font-medium leading-tight">
                            {item.task}
                        </div>
                        <div className="text-red-400/80 text-xs mt-1 uppercase tracking-wide">
                            {item.blocker}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
