"use client";

import { ObserverTable, Column } from "../ObserverTable";
import { cn } from "@/lib/utils";

export type BackgroundJob = {
    id: string;
    timestamp: string;
    job: string;
    status: 'ok' | 'skipped' | 'failed';
    note?: string;
};

// STUB DATA
const STUB_BACKGROUND_JOBS: BackgroundJob[] = [
    { id: '1', timestamp: new Date().toISOString(), job: 'runDailyPulse', status: 'ok' },
    { id: '2', timestamp: new Date(Date.now() - 3600000).toISOString(), job: 'dataCleanup', status: 'skipped', note: 'Nothing to clean' },
    { id: '3', timestamp: new Date(Date.now() - 7200000).toISOString(), job: 'syncCalendar', status: 'failed', note: 'Timeout' }
];

export function BackgroundPanel() {
    const columns: Column<BackgroundJob>[] = [
        {
            header: 'Job',
            accessor: (item) => <span className="font-mono text-sm">{item.job}</span>
        },
        {
            header: 'Status',
            accessor: (item) => (
                <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium uppercase",
                    item.status === 'ok' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                        item.status === 'failed' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                            "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                )}>
                    {item.status}
                </span>
            )
        },
        {
            header: 'Note',
            accessor: (item) => item.note ? <span className="text-zinc-500 text-sm">{item.note}</span> : <span className="text-zinc-300">-</span>
        },
        {
            header: 'Time',
            accessor: (item) => <span className="text-xs text-zinc-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
        }
    ];

    return <ObserverTable columns={columns} data={data} emptyMessage="No background jobs." />;
}
