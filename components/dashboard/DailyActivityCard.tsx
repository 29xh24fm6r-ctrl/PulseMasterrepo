"use client";

import { useEffect, useMemo, useState } from "react";

type Row = { day: string; event_count: number };

export function DailyActivityCard({ days = 14 }: { days?: number }) {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [status, setStatus] = useState<"processing" | "ready" | "failed">("ready");

    useEffect(() => {
        let cancelled = false;

        async function run() {
            setLoading(true);
            setErr(null);
            try {
                const res = await fetch(`/api/activity/daily?days=${days}`, { cache: "no-store" });
                const json = await res.json();
                if (!res.ok) throw new Error(json?.error ?? "Failed to fetch daily activity");
                if (!cancelled) {
                    setRows(json.rows ?? []);
                    setStatus(json.status ?? "ready");
                }
            } catch (e: any) {
                if (!cancelled) {
                    setErr(e?.message ?? "Unknown error");
                    setStatus("failed");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [days]);

    const todayCount = useMemo(() => {
        if (!rows.length) return 0;
        return rows[rows.length - 1]?.event_count ?? 0;
    }, [rows]);

    const total = useMemo(() => rows.reduce((acc, r) => acc + (r.event_count ?? 0), 0), [rows]);

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-sm text-white/60">Daily Activity</div>
                    <div className="text-2xl font-semibold">{todayCount}</div>
                    {/* Status Indicator (F2) */}
                    {status === "processing" && (
                        <div className="mt-1 text-xs text-yellow-300 animate-pulse">
                            Updating...
                        </div>
                    )}
                    {status === "failed" && (
                        <div className="mt-1 text-xs text-red-400">
                            Update failed
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <div className="text-sm text-white/60">Last {days} days</div>
                    <div className="text-base font-medium">{total} events</div>
                </div>
            </div>

            <div className="mt-4">
                {loading ? (
                    <div className="text-sm text-white/60">Loading…</div>
                ) : err ? (
                    <div className="text-sm text-red-300">{err}</div>
                ) : rows.length === 0 ? (
                    <div className="text-sm text-white/60">No activity yet.</div>
                ) : (
                    <div className="flex gap-1 items-end h-16">
                        {rows.map((r) => {
                            const h = Math.min(100, (r.event_count ?? 0) * 10); // simple scale
                            return (
                                <div
                                    key={r.day}
                                    title={`${r.day}: ${r.event_count}`}
                                    className="w-2 rounded-md bg-white/30"
                                    style={{ height: `${Math.max(6, h)}%` }}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
