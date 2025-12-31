"use client";

import { useEffect, useState } from "react";

export default function OpsAuditView() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetch("/api/ops/audit")
            .then((r) => r.json())
            .then((res) => setItems(res.items ?? []))
            .catch(() => setItems([]))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-end justify-between mb-6">
                    <div>
                        <div className="text-3xl font-semibold tracking-tight">Ops Audit Log</div>
                        <div className="text-zinc-400 mt-1">Immutable record of all sensitive operations.</div>
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-zinc-500 border-b border-zinc-800">
                            <tr>
                                <th className="py-2 pr-4">Time</th>
                                <th className="py-2 pr-4">Action</th>
                                <th className="py-2 pr-4">Actor</th>
                                <th className="py-2 pr-4">Target</th>
                                <th className="py-2 pr-4">Resource</th>
                                <th className="py-2 pr-4">Ctx</th>
                                <th className="py-2 pr-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {items.map((x) => (
                                <tr key={x.id} className="hover:bg-zinc-900/50 transition-colors">
                                    <td className="py-3 pr-4 text-zinc-400 font-mono text-xs whitespace-nowrap">
                                        {new Date(x.created_at).toLocaleString()}
                                    </td>
                                    <td className="py-3 pr-4 text-zinc-200 font-medium">{x.action}</td>
                                    <td className="py-3 pr-4 text-zinc-400 text-xs font-mono">{x.actor_user_id?.slice(0, 8)}...</td>
                                    <td className="py-3 pr-4 text-zinc-400 text-xs font-mono">{x.target_user_id?.slice(0, 8)}...</td>
                                    <td className="py-3 pr-4 text-zinc-300 text-xs">
                                        <div className="font-mono text-zinc-500">{x.resource_type}</div>
                                        <div>{x.resource_id}</div>
                                    </td>
                                    <td className="py-3 pr-4 text-zinc-500 text-xs max-w-xs truncate">
                                        {JSON.stringify(x.meta)}
                                    </td>
                                    <td className="py-3 pr-4">
                                        <div className="flex gap-2">
                                            {x.resource_type === "trace" && (
                                                <>
                                                    <a
                                                        className="px-3 py-1 rounded-lg border border-zinc-800 bg-zinc-950/20 text-zinc-300 text-xs hover:bg-zinc-900/40 hover:text-zinc-100"
                                                        href={`/traces/${encodeURIComponent(x.resource_id)}`}
                                                    >
                                                        Open
                                                    </a>
                                                    <a
                                                        className="px-3 py-1 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-300 text-xs hover:bg-blue-500/20"
                                                        href={`/ops/blast?trace_id=${encodeURIComponent(x.resource_id)}`}
                                                    >
                                                        Blast
                                                    </a>
                                                </>
                                            )}
                                            {(x.action === "executions.worker.run" || x.resource_type === "execution") && x.resource_id && (
                                                <a
                                                    className="px-3 py-1 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-300 text-xs hover:bg-blue-500/20"
                                                    href={`/ops/blast?execution_id=${encodeURIComponent(x.resource_id)}`}
                                                >
                                                    Blast
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-zinc-500">
                                        No audit logs found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
