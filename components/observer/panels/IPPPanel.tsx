"use client";

import { ObserverTable, Column } from "../ObserverTable";
import { Check, XCircle } from "lucide-react";

export type IPPEvent = {
    id: string;
    timestamp: string;
    blocker: 'auth' | 'network' | 'data' | 'unknown';
    message: string;
    resolved?: boolean;
};

// STUB DATA
const STUB_IPP_EVENTS: IPPEvent[] = [
    { id: '1', timestamp: new Date(Date.now() - 100000).toISOString(), blocker: 'network', message: 'Connection lost briefly', resolved: true },
    { id: '2', timestamp: new Date().toISOString(), blocker: 'data', message: 'Schema mismatch in user_settings', resolved: false }
];

export function IPPPanel() {
    const columns: Column<IPPEvent>[] = [
        {
            header: 'State',
            accessor: (item) => item.resolved
                ? <Check className="w-4 h-4 text-emerald-500" />
                : <XCircle className="w-4 h-4 text-red-500" />,
            className: 'w-12'
        },
        {
            header: 'Blocker',
            accessor: (item) => <span className="uppercase text-xs font-bold text-zinc-500">{item.blocker}</span>
        },
        {
            header: 'Message',
            accessor: (item) => item.message
        },
        {
            header: 'Time',
            accessor: (item) => <span className="text-xs text-zinc-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
        }
    ];

    return <ObserverTable columns={columns} data={data} emptyMessage="No IPP events logged." />;
}
