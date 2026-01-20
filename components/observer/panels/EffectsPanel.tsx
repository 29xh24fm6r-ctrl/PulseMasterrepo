"use client";

import { ObserverTable, Column } from "../ObserverTable";
import { useOverlays } from "@/components/shell/overlays/OverlayContext";
import { HelpCircle, User, Zap } from "lucide-react";

export type EffectRecord = {
    id: string;
    timestamp: string;
    domain: string;
    action: string;
    status: 'applied' | 'queued' | 'reverted';
    source: 'pulse' | 'you';
    explainable?: boolean;
};

// STUB DATA
const STUB_EFFECT_RECORDS: EffectRecord[] = [
    { id: '1', timestamp: new Date().toISOString(), domain: 'tasks', action: 'create_todo', status: 'applied', source: 'pulse', explainable: true },
    { id: '2', timestamp: new Date(Date.now() - 3600000).toISOString(), domain: 'calendar', action: 'move_event', status: 'reverted', source: 'you' },
    { id: '3', timestamp: new Date(Date.now() - 7200000).toISOString(), domain: 'data', action: 'sync_contacts', status: 'queued', source: 'pulse' }
];

export function EffectsPanel() {
    const { setExplanationActive } = useOverlays();

    const columns: Column<EffectRecord>[] = [
        {
            header: 'Source',
            accessor: (item) => item.source === 'pulse'
                ? <Zap className="w-4 h-4 text-violet-500" />
                : <User className="w-4 h-4 text-zinc-500" />,
            className: 'w-12'
        },
        {
            header: 'Action',
            accessor: (item) => (
                <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.action}</div>
                    <div className="text-xs text-zinc-500 font-mono">{item.domain}</div>
                </div>
            )
        },
        {
            header: 'Status',
            accessor: (item) => (
                <span className={
                    item.status === 'applied' ? "text-emerald-500" :
                        item.status === 'reverted' ? "text-red-500 line-through" :
                            "text-amber-500"
                }>
                    {item.status}
                </span>
            )
        },
        {
            header: 'Since',
            accessor: (item) => <span className="text-xs text-zinc-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
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

    return <ObserverTable columns={columns} data={data} emptyMessage="No effects recorded." />;
}
