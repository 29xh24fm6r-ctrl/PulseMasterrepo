"use client";

import { useState, useEffect } from "react";
import { Clock, RefreshCcw, Activity } from "lucide-react";

export function RecentActivity() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        setErr(null);
        try {
            const r = await fetch("/api/activity/recent?limit=10", { cache: "no-store" });
            const j = await r.json();
            if (!j.ok) throw new Error(j.detail || j.error || "Failed to load activity");
            setItems(j.items ?? []);
        } catch (e: any) {
            setErr(e?.message ?? String(e));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    return (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md h-full">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-violet-400" />
                    <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
                </div>
                <button
                    onClick={load}
                    className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    title="Refresh"
                >
                    <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="space-y-4">
                {loading && items.length === 0 && (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
                        ))}
                    </div>
                )}

                {err && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
                        Failed to load: {err}
                    </div>
                )}

                {!loading && !err && items.length === 0 && (
                    <div className="text-center py-10 text-white/30">
                        <Clock className="w-8 h-8 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No recent activity found.</p>
                    </div>
                )}

                {!loading && !err && items.length > 0 && (
                    <ul className="space-y-3">
                        {items.map((x) => (
                            <li key={x.id} className="group relative">
                                <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                    <div className="mt-1 h-2 w-2 rounded-full bg-violet-500 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="font-medium text-gray-200 text-sm">{x.title}</div>
                                        {x.detail ? <div className="text-xs text-gray-500 truncate mt-0.5">{x.detail}</div> : null}
                                    </div>
                                    <div className="text-[10px] text-gray-600 whitespace-nowrap font-mono mt-1">
                                        {new Date(x.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
