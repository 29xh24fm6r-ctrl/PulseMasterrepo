"use client";

import { useEffect, useState } from "react";

type Health = {
    ok: true;
    core: any;
    rls: Array<{ tablename: string; rowsecurity: boolean }>;
    fails: Array<{ domain: string; occurred_at: string; message: string; ref: string }>;
};

export default function MonitoringPage() {
    const [data, setData] = useState<Health | null>(null);
    const [err, setErr] = useState<string | null>(null);

    async function load() {
        setErr(null);
        const res = await fetch("/api/health/summary", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
            setErr(json?.error ?? "Failed to load health");
            return;
        }
        setData(json);
    }

    useEffect(() => {
        load();
    }, []);

    const core = data?.core;

    // Alerts logic
    const alerts = [];
    if (core) {
        if (core.zero_uuid_events_24h > 0) alerts.push("⚠️ Zero-UUID events detected in last 24h");
        if (core.follow_ups_null_owner > 0) alerts.push(`⚠️ ${core.follow_ups_null_owner} Follow-ups with NULL owner`);
        if (core.tasks_null_owner > 0) alerts.push(`⚠️ ${core.tasks_null_owner} Tasks with NULL owner`);
    }
    if (data?.rls?.some((r) => !r.rowsecurity)) alerts.push("🚨 RLS disabled on critical table(s)");
    if (data?.fails?.length) alerts.push(`⚠️ ${data.fails.length} recent system failures`);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Monitoring</h1>
                    <p className="text-sm opacity-70">Canon + RLS + integrity signals.</p>
                </div>
                <button className="border rounded-lg px-3 py-2" onClick={load}>
                    Refresh
                </button>
            </div>

            {err && <div className="border rounded-lg p-3 text-sm text-red-500 bg-red-900/10 border-red-900">{err}</div>}

            {alerts.length > 0 && (
                <div className="border border-red-500/50 bg-red-500/10 rounded-xl p-4 space-y-2">
                    <h3 className="font-semibold text-red-400">Active Alerts</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-red-300">
                        {alerts.map((a, i) => (
                            <li key={i}>{a}</li>
                        ))}
                    </ul>
                </div>
            )}

            {!data ? (
                <div className="text-sm opacity-70">Loading…</div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Canon Stats */}
                    <div className="border border-zinc-800 rounded-xl p-4 space-y-3 bg-zinc-900/30">
                        <div className="font-medium flex items-center gap-2">🛡️ Canon Integrity</div>
                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                            <div className="opacity-70">Active identities:</div>
                            <div className="font-mono text-right">{core.active_identities}</div>

                            <div className="opacity-70">Zero-UUID events (total):</div>
                            <div className="font-mono text-right">{core.zero_uuid_events_total}</div>

                            <div className={`opacity-70 ${core.zero_uuid_events_24h > 0 ? "text-red-400 font-bold" : ""}`}>Zero-UUID events (24h):</div>
                            <div className={`font-mono text-right ${core.zero_uuid_events_24h > 0 ? "text-red-400 font-bold" : ""}`}>{core.zero_uuid_events_24h}</div>

                            <div className="col-span-2 pt-2 border-t border-zinc-800 opacity-70">Null Owners:</div>
                            <div className="pl-4">Follow-ups:</div>
                            <div className={`font-mono text-right ${core.follow_ups_null_owner > 0 ? "text-red-400 font-bold" : ""}`}>{core.follow_ups_null_owner}</div>
                            <div className="pl-4">Tasks:</div>
                            <div className={`font-mono text-right ${core.tasks_null_owner > 0 ? "text-red-400 font-bold" : ""}`}>{core.tasks_null_owner}</div>
                        </div>
                    </div>

                    {/* RLS Status */}
                    <div className="border border-zinc-800 rounded-xl p-4 space-y-3 bg-zinc-900/30">
                        <div className="font-medium flex items-center gap-2">🔒 RLS Status</div>
                        <div className="space-y-1 max-h-[200px] overflow-y-auto">
                            {data.rls.map((r) => (
                                <div key={r.tablename} className="text-sm flex justify-between items-center py-1 border-b border-zinc-800/50 last:border-0">
                                    <span className="font-mono opacity-80">{r.tablename}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-mono ${r.rowsecurity ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400 font-bold"}`}>
                                        {String(r.rowsecurity)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Failures */}
                    <div className="border border-zinc-800 rounded-xl p-4 space-y-3 bg-zinc-900/30 md:col-span-2">
                        <div className="font-medium flex items-center gap-2">🚨 Recent Failures (7d)</div>
                        {!data.fails?.length ? (
                            <div className="text-sm opacity-50 py-4 text-center">No recent failures detected. All systems nominal.</div>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {data.fails.map((f, i) => (
                                    <div key={i} className="text-sm border border-red-900/30 bg-red-900/5 p-2 rounded flex flex-col gap-1">
                                        <div className="flex justify-between opacity-70 text-xs">
                                            <span className="uppercase font-bold tracking-wider">{f.domain}</span>
                                            <span className="font-mono">{new Date(f.occurred_at).toLocaleString()}</span>
                                        </div>
                                        <div className="text-red-300 font-mono text-xs break-all">{f.message}</div>
                                        <div className="text-[10px] opacity-40 font-mono">{f.ref}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
