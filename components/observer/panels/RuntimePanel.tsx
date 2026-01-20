"use client";

import { ObserverTable, Column } from "../ObserverTable";

export type RuntimeEvent = {
    id: string;
    timestamp: string;
    type: 'tick' | 'decision' | 'note';
    summary: string;
    detail?: string;
};

// STUB DATA
const STUB_RUNTIME_EVENTS: RuntimeEvent[] = [
    { id: '1', timestamp: new Date().toISOString(), type: 'tick', summary: 'Heartbeat Check', detail: 'System nominal' },
    { id: '2', timestamp: new Date(Date.now() - 5000).toISOString(), type: 'decision', summary: 'Silence Maintained', detail: 'User preference: Quiet' },
    { id: '3', timestamp: new Date(Date.now() - 60000).toISOString(), type: 'note', summary: 'Context Refreshed', detail: 'Location update' },
];

export function RuntimePanel() {
    const columns: Column<RuntimeEvent>[] = [
        {
            header: 'Time',
            accessor: (item) => <span className="text-zinc-500 font-mono text-xs">{new Date(item.timestamp).toLocaleTimeString()}</span>,
            className: 'w-24'
        },
        {
            header: 'Type',
            accessor: (item) => (
                <span className={item.type === 'decision' ? "text-violet-600 font-medium" : "text-zinc-600"}>
                    {item.type.toUpperCase()}
                </span>
            ),
            className: 'w-24'
        },
        {
            header: 'Summary',
            accessor: (item) => (
                <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.summary}</div>
                    {item.detail && <div className="text-xs text-zinc-500">{item.detail}</div>}
                </div>
            )
        },
    ];

    return <ObserverTable columns={columns} data={data} emptyMessage="No recent runtime events." />;
}
