"use client";

import { ObserverTable, Column } from "../ObserverTable";
import { useOverlays } from "@/components/shell/overlays/OverlayContext";
import { HelpCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type AutonomyRecord = {
    id: string;
    domain: string;
    action: string;
    eligibility: 'Locked' | 'Confirm' | 'Eligible' | 'Paused';
    confidence: number;
    decay?: number;
    drift?: boolean;
    explainable?: boolean;
};

// STUB DATA
const STUB_AUTONOMY_RECORDS: AutonomyRecord[] = [
    {
        id: '1', domain: 'tasks', action: 'create', eligibility: 'Eligible', confidence: 0.95
    },
    {
        id: '2', domain: 'chef', action: 'order_groceries', eligibility: 'Locked', confidence: 0.3, drift: true, explainable: true
    },
    {
        id: '3', domain: 'calendar', action: 'reschedule', eligibility: 'Confirm', confidence: 0.7, decay: 0.2, explainable: true
    }
];

export function AutonomyPanel() {
    const { setExplanationActive } = useOverlays();

    const columns: Column<AutonomyRecord>[] = [
        {
            header: 'Domain',
            accessor: (item) => <span className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">{item.domain}</span>
        },
        {
            header: 'Action',
            accessor: (item) => item.action
        },
        {
            header: 'Eligibility',
            accessor: (item) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    item.eligibility === 'Eligible' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                        item.eligibility === 'Locked' ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500" :
                            "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                )}>
                    {item.eligibility}
                </span>
            )
        },
        {
            header: 'Confidence',
            accessor: (item) => (
                <div className="flex items-center gap-2">
                    <div className="w-16 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500" style={{ width: `${item.confidence * 100}%` }} />
                    </div>
                    <span className="text-xs text-zinc-500">{(item.confidence * 100).toFixed(0)}%</span>
                </div>
            )
        },
        {
            header: 'Flags',
            accessor: (item) => (
                <div className="flex gap-2">
                    {item.drift && (
                        <span className="flex items-center gap-1 text-xs text-red-500 font-medium" title="Drift Detected">
                            <AlertTriangle className="w-3 h-3" /> Drift
                        </span>
                    )}
                    {item.decay && item.decay > 0 && (
                        <span className="text-xs text-amber-500" title={`Decay: ${item.decay}`}>
                            Decay ({item.decay})
                        </span>
                    )}
                </div>
            )
        },
        {
            header: '',
            accessor: (item) => item.explainable ? (
                <button onClick={() => setExplanationActive(true)} className="text-zinc-400 hover:text-violet-500">
                    <HelpCircle className="w-4 h-4" />
                </button>
            ) : null,
            className: 'w-10 text-right'
        }
    ];

    return <ObserverTable columns={columns} data={data} emptyMessage="No autonomy records found." />;
}
