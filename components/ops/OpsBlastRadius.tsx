"use client";

import { useState } from "react";

export default function OpsBlastRadius() {
    const [traceId, setTraceId] = useState("");
    const [executionId, setExecutionId] = useState("");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    async function run() {
        setLoading(true);
        try {
            const u = new URL("/api/ops/blast_radius", window.location.origin);
            if (traceId) u.searchParams.set("trace_id", traceId);
            if (!traceId && executionId) u.searchParams.set("execution_id", executionId);

            const res = await fetch(u.toString()).then(r => r.json());
            setData(res?.ok ? res : null);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-end justify-between">
                    <div>
                        <div className="text-3xl font-semibold tracking-tight">Blast Radius</div>
                        <div className="text-zinc-400 mt-1">See what a trace/execution touched or created.</div>
                    </div>
                    <a className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950/20 text-sm hover:bg-zinc-900/40" href="/ops/traces">
                        Trace Search
                    </a>
                </div>

                <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-zinc-500">trace_id</label>
                            <input className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm font-mono"
                                value={traceId} onChange={(e) => setTraceId(e.target.value)} placeholder="uuid" />
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500">execution_id (if no trace)</label>
                            <input className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm font-mono"
                                value={executionId} onChange={(e) => setExecutionId(e.target.value)} placeholder="uuid" />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950/20 text-sm hover:bg-zinc-900/40" onClick={run}>
                            {loading ? "Loading…" : "Compute"}
                        </button>
                    </div>
                </div>

                {data && (
                    <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                            <div className="text-sm uppercase tracking-wider text-zinc-400">Artifacts</div>
                            <div className="mt-4 text-sm text-zinc-300">Evidence: {data.artifacts?.evidence?.length ?? 0}</div>
                            <div className="text-sm text-zinc-300">Tasks: {data.artifacts?.tasks?.length ?? 0}</div>
                            <div className="text-sm text-zinc-300">Outbox: {data.artifacts?.outbox?.length ?? 0}</div>
                            {data.trace_id && (
                                <a className="inline-block mt-4 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950/20 text-xs hover:bg-zinc-900/40"
                                    href={`/traces/${encodeURIComponent(data.trace_id)}`}>
                                    Open Trace
                                </a>
                            )}
                        </div>

                        <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                            <div className="text-sm uppercase tracking-wider text-zinc-400">Relations</div>
                            <div className="mt-4 space-y-2">
                                {(data.links ?? []).slice(0, 200).map((x: any) => (
                                    <div key={x.id} className="text-xs text-zinc-300 rounded-xl border border-zinc-800 bg-zinc-950/20 p-3">
                                        <span className="font-mono text-zinc-400">{x.from_type}</span>
                                        <span className="text-zinc-500">:</span>
                                        <span className="font-mono">{String(x.from_id ?? x.from_key ?? "—").slice(0, 12)}</span>
                                        <span className="text-zinc-500"> → </span>
                                        <span className="text-zinc-200">{x.relation}</span>
                                        <span className="text-zinc-500"> → </span>
                                        <span className="font-mono text-zinc-400">{x.to_type}</span>
                                        <span className="text-zinc-500">:</span>
                                        <span className="font-mono">{String(x.to_id ?? x.to_key ?? "—").slice(0, 12)}</span>
                                    </div>
                                ))}
                                {(data.links ?? []).length === 0 && <div className="text-zinc-400">No relations recorded.</div>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
