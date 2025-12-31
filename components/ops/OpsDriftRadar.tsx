"use client";

import { useEffect, useMemo, useState } from "react";

function pct(x: number) {
    return (x * 100).toFixed(1) + "%";
}

export default function OpsDriftRadar() {
    const [kind, setKind] = useState("");
    const [baselineDays, setBaselineDays] = useState(7);
    const [recentHours, setRecentHours] = useState(6);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const url = useMemo(() => {
        const u = new URL("/api/ops/drift", window.location.origin);
        if (kind) u.searchParams.set("kind", kind);
        u.searchParams.set("baseline_days", String(baselineDays));
        u.searchParams.set("recent_hours", String(recentHours));
        return u.toString();
    }, [kind, baselineDays, recentHours]);

    async function load() {
        setLoading(true);
        try {
            const res = await fetch(url).then(r => r.json());
            setItems(res?.ok ? res.items ?? [] : []);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []); // initial load

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <div className="text-3xl font-semibold tracking-tight">Execution Drift Radar</div>
                        <div className="text-zinc-400 mt-1">Detect regressions in failure rate and p95 duration.</div>
                    </div>
                    <div className="flex gap-2">
                        <a className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950/20 text-sm hover:bg-zinc-900/40" href="/ops/traces">
                            Trace Search
                        </a>
                        <a className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950/20 text-sm hover:bg-zinc-900/40" href="/ops/audit">
                            Ops Audit
                        </a>
                    </div>
                </div>

                <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-4">
                            <label className="text-xs text-zinc-500">Kind (optional)</label>
                            <input className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm"
                                value={kind} onChange={(e) => setKind(e.target.value)} placeholder="email.flush" />
                        </div>
                        <div className="md:col-span-3">
                            <label className="text-xs text-zinc-500">Baseline days</label>
                            <input type="number" className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm"
                                value={baselineDays} min={1} max={30} onChange={(e) => setBaselineDays(Number(e.target.value))} />
                        </div>
                        <div className="md:col-span-3">
                            <label className="text-xs text-zinc-500">Recent hours</label>
                            <input type="number" className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm"
                                value={recentHours} min={1} max={48} onChange={(e) => setRecentHours(Number(e.target.value))} />
                        </div>
                        <div className="md:col-span-2 flex items-end justify-end">
                            <button className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950/20 text-sm hover:bg-zinc-900/40"
                                onClick={load}>
                                {loading ? "Loading…" : "Refresh"}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 overflow-auto">
                    <div className="text-sm uppercase tracking-wider text-zinc-400">Kinds</div>

                    <table className="w-full mt-4 text-sm">
                        <thead className="text-zinc-400">
                            <tr className="border-b border-zinc-800">
                                <th className="text-left py-2 pr-4">Kind</th>
                                <th className="text-left py-2 pr-4">Baseline runs</th>
                                <th className="text-left py-2 pr-4">Baseline fail%</th>
                                <th className="text-left py-2 pr-4">Baseline p95 ms</th>
                                <th className="text-left py-2 pr-4">Recent runs</th>
                                <th className="text-left py-2 pr-4">Recent fail%</th>
                                <th className="text-left py-2 pr-4">Recent p95 ms</th>
                                <th className="text-left py-2 pr-4">Δ fail%</th>
                                <th className="text-left py-2 pr-4">Δ p95 ms</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((x) => (
                                <tr key={x.kind} className="border-b border-zinc-900">
                                    <td className="py-2 pr-4 text-zinc-200">{x.kind}</td>
                                    <td className="py-2 pr-4 text-zinc-300">{x.baseline_runs}</td>
                                    <td className="py-2 pr-4 text-zinc-300">{pct(Number(x.baseline_failure_rate ?? 0))}</td>
                                    <td className="py-2 pr-4 text-zinc-300">{Math.round(Number(x.baseline_p95_duration_ms ?? 0))}</td>
                                    <td className="py-2 pr-4 text-zinc-300">{x.recent_runs}</td>
                                    <td className="py-2 pr-4 text-zinc-300">{pct(Number(x.recent_failure_rate ?? 0))}</td>
                                    <td className="py-2 pr-4 text-zinc-300">{Math.round(Number(x.recent_p95_duration_ms ?? 0))}</td>
                                    <td className="py-2 pr-4 text-zinc-300">
                                        {pct(Number(x.drift_failure_rate_delta ?? 0))}
                                    </td>
                                    <td className="py-2 pr-4 text-zinc-300">
                                        {Math.round(Number(x.drift_p95_duration_delta_ms ?? 0))}
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && !loading && (
                                <tr><td className="py-4 text-zinc-400" colSpan={9}>No data.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
